import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { satisfies } from 'semver'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const dependencyReview = readFileSync(
  resolve(root, '.github/workflows/dependency-review.yml'),
  'utf8'
)
const pagesWorkflow = readFileSync(resolve(root, '.github/workflows/nextjs.yml'), 'utf8')
const dependencyAuditWorkflowPath = resolve(root, '.github/workflows/dependency-audit.yml')
const packageManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const packageLockfile = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8')) as {
  packages: Record<
    string,
    {
      version?: string
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    }
  >
}
const yarnLockfile = readFileSync(resolve(root, 'yarn.lock'), 'utf8')

describe('dependency security gate contract', () => {
  it('locks a compatible brace-expansion for each npm minimatch instance', () => {
    const { packages } = packageLockfile
    const instances = Object.entries(packages).filter(([name]) => name.endsWith('/minimatch'))

    expect(instances.length).toBeGreaterThan(0)
    for (const [name, instance] of instances) {
      const segments = name.split('/node_modules/')
      const candidates = segments
        .map(
          (_, index) =>
            `${segments.slice(0, index + 1).join('/node_modules/')}/node_modules/brace-expansion`
        )
        .reverse()
      const actual = [...candidates, 'node_modules/brace-expansion']
        .map((path) => packages[path])
        .find(Boolean)?.version
      const range = instance.dependencies?.['brace-expansion']

      expect(
        Boolean(actual && range && satisfies(actual, range)),
        `${name}: ${actual} vs ${range}`
      ).toBe(true)
    }
  })

  it('expands brace globs in both installed ESLint dependency paths', () => {
    const fromRoot = createRequire(resolve(root, 'package.json'))
    const fromNext = createRequire(fromRoot.resolve('eslint-config-next'))
    const fromTypescriptEslint = createRequire(fromNext.resolve('typescript-eslint'))
    const fromParser = createRequire(fromTypescriptEslint.resolve('@typescript-eslint/parser'))
    const consumers = [
      createRequire(fromRoot.resolve('eslint')),
      createRequire(fromParser.resolve('@typescript-eslint/typescript-estree')),
    ]

    for (const fromConsumer of consumers) {
      const { minimatch } = fromConsumer('minimatch')
      expect(minimatch('app/page.tsx', '**/*.{js,ts,tsx}')).toBe(true)
    }
  })

  it('reviews manifest changes on both integration branches and blocks High or Critical', () => {
    expect(dependencyReview).toContain('pull_request:')
    expect(dependencyReview).toContain('branches: [staging, main]')
    expect(dependencyReview).toContain('actions/dependency-review-action@v5')
    expect(dependencyReview).toContain('fail-on-severity: high')
    expect(dependencyReview).toContain('contents: read')
  })

  it('audits both lockfiles before the Pages build', () => {
    const installIndex = pagesWorkflow.indexOf('name: Install dependencies')
    const yarnAuditIndex = pagesWorkflow.indexOf('yarn audit:yarn-high')
    const npmAuditIndex = pagesWorkflow.indexOf('npm audit --audit-level=high')
    const buildIndex = pagesWorkflow.indexOf('name: Build with Next.js')

    expect(existsSync(resolve(root, 'yarn.lock'))).toBe(true)
    expect(existsSync(resolve(root, 'package-lock.json'))).toBe(true)
    expect(installIndex).toBeGreaterThanOrEqual(0)
    expect(yarnAuditIndex).toBeGreaterThan(installIndex)
    expect(npmAuditIndex).toBeGreaterThan(installIndex)
    expect(buildIndex).toBeGreaterThan(yarnAuditIndex)
    expect(buildIndex).toBeGreaterThan(npmAuditIndex)
  })

  it('blocks staging and main pull requests on High or Critical lockfile findings', () => {
    expect(existsSync(dependencyAuditWorkflowPath)).toBe(true)

    const auditWorkflow = readFileSync(dependencyAuditWorkflowPath, 'utf8')
    const installIndex = auditWorkflow.indexOf('name: Install dependencies')
    const yarnAuditIndex = auditWorkflow.indexOf('yarn audit:yarn-high')
    const npmAuditIndex = auditWorkflow.indexOf('npm audit --audit-level=high')

    expect(auditWorkflow).toContain('pull_request:')
    expect(auditWorkflow).toContain('branches: [staging, main]')
    expect(auditWorkflow).toContain('node-version: 24')
    expect(installIndex).toBeGreaterThanOrEqual(0)
    expect(yarnAuditIndex).toBeGreaterThan(installIndex)
    expect(npmAuditIndex).toBeGreaterThan(installIndex)
  })

  it('uses the severity-aware Yarn wrapper instead of the non-gating level filter', () => {
    expect(packageManifest.scripts['audit:yarn-high']).toBe('node scripts/check-yarn-audit.mjs')
    expect(pagesWorkflow).toContain('run: yarn audit:yarn-high')
    expect(readFileSync(dependencyAuditWorkflowPath, 'utf8')).toContain('run: yarn audit:yarn-high')
  })

  it('keeps legacy OpenTelemetry packages within their supported API peer range', () => {
    expect(packageManifest.dependencies['@opentelemetry/api']).toBe('1.9.0')
    expect(packageManifest.resolutions['**/@opentelemetry/api']).toBe('1.9.0')
    expect(packageManifest.overrides['@opentelemetry/api']).toBe('1.9.0')
    expect(packageManifest.dependencies['@opentelemetry/core']).toBe('1.30.1')
    expect(packageManifest.resolutions['**/@opentelemetry/propagator-jaeger']).toBe('2.12.0')
    expect(packageManifest.overrides['@opentelemetry/propagator-jaeger']).toBe('2.12.0')
    expect(packageLockfile.packages['node_modules/@opentelemetry/core'].version).toBe('1.30.1')
    expect(packageLockfile.packages['node_modules/@opentelemetry/propagator-jaeger'].version).toBe(
      '2.12.0'
    )
    expect(
      packageLockfile.packages[
        'node_modules/@opentelemetry/propagator-jaeger/node_modules/@opentelemetry/core'
      ].version
    ).toBe('2.12.0')
    expect(yarnLockfile).toMatch(
      /"@opentelemetry\/propagator-jaeger@2\.12\.0":\n {2}version "2\.12\.0"/
    )
    expect(yarnLockfile).toMatch(/"@opentelemetry\/core@2\.12\.0":\n {2}version "2\.12\.0"/)
  })

  it('satisfies the actual API peer range of every locked OpenTelemetry consumer', () => {
    const apiVersion = packageManifest.dependencies['@opentelemetry/api']
    const consumers = Object.entries(packageLockfile.packages).flatMap(
      ([packagePath, dependency]) => {
        const peerRange = dependency.peerDependencies?.['@opentelemetry/api']
        return packagePath.includes('node_modules/@opentelemetry/') && peerRange
          ? [{ packagePath, peerRange }]
          : []
      }
    )

    expect(consumers.length).toBeGreaterThan(0)
    for (const { packagePath, peerRange } of consumers) {
      expect(satisfies(apiVersion, peerRange), `${packagePath}: ${peerRange}`).toBe(true)
    }
  })

  it('resolves the compatible API version consistently in both lockfiles', () => {
    const apiVersion = packageManifest.dependencies['@opentelemetry/api']

    expect(packageLockfile.packages[''].dependencies?.['@opentelemetry/api']).toBe(apiVersion)
    expect(packageLockfile.packages['node_modules/@opentelemetry/api'].version).toBe(apiVersion)
    expect(/"@opentelemetry\/api@[^\n]+:\n {2}version "1\.9\.0"/.test(yarnLockfile)).toBe(true)
  })

  it('declares the OpenTelemetry SDK peer imported by the legacy telemetry package', () => {
    expect(packageManifest.dependencies['@opentelemetry/sdk-trace-base']).toBe('1.30.1')
  })
})
