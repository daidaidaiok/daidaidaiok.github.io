import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const dependencyReview = readFileSync(
  resolve(root, '.github/workflows/dependency-review.yml'),
  'utf8'
)
const pagesWorkflow = readFileSync(resolve(root, '.github/workflows/nextjs.yml'), 'utf8')
const dependencyAuditWorkflowPath = resolve(root, '.github/workflows/dependency-audit.yml')
const packageManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

describe('dependency security gate contract', () => {
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
    expect(packageManifest.resolutions['**/@opentelemetry/propagator-jaeger']).toBe('2.9.0')
    expect(packageManifest.overrides['@opentelemetry/propagator-jaeger']).toBe('2.9.0')
  })
})
