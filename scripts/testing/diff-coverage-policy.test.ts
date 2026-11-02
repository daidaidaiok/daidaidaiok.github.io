import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  calculateDiffCoverage,
  isRuntimeSourcePath,
  parseLcov,
  parseUnifiedDiff,
  run,
} from '../check-diff-coverage.mjs'

const temporaryDirectories: string[] = []

function runChecker(options: {
  runtime: boolean
  covered: number
  total: number
  threshold?: number
}) {
  const root = mkdtempSync(join(tmpdir(), 'hpb-diff-coverage-'))
  temporaryDirectories.push(root)
  const sourcePath = options.runtime ? 'components/fixture.ts' : 'docs/fixture.md'
  const sourceFile = join(root, sourcePath)
  const diffFile = join(root, 'change.diff')
  const lcovFile = join(root, 'lcov.info')

  mkdirSync(join(root, sourcePath.slice(0, sourcePath.lastIndexOf('/'))), { recursive: true })
  writeFileSync(
    sourceFile,
    Array.from({ length: options.total }, (_, index) => `const value${index} = ${index}`).join('\n')
  )

  const addedLines = Array.from(
    { length: options.total },
    (_, index) => `+const value${index} = ${index}`
  ).join('\n')
  writeFileSync(
    diffFile,
    `diff --git a/${sourcePath} b/${sourcePath}\nnew file mode 100644\n--- /dev/null\n+++ b/${sourcePath}\n@@ -0,0 +1,${options.total} @@\n${addedLines}\n`
  )

  const coverageLines = Array.from(
    { length: options.total },
    (_, index) => `DA:${index + 1},${index < options.covered ? 1 : 0}`
  ).join('\n')
  writeFileSync(lcovFile, `SF:${sourceFile}\n${coverageLines}\nend_of_record\n`)

  return run([
    '--diff-file',
    diffFile,
    '--lcov-file',
    lcovFile,
    '--root',
    root,
    '--threshold',
    String(options.threshold ?? 80),
  ])
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('diff coverage policy', () => {
  it('passes when changed runtime lines meet the threshold', () => {
    const result = runChecker({ runtime: true, covered: 4, total: 5 })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('80.0% (4/5 executable changed lines)')
  })

  it('fails when changed runtime lines fall below the threshold', () => {
    const result = runChecker({ runtime: true, covered: 3, total: 5 })

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('60.0% (3/5 executable changed lines)')
  })

  it('skips documentation-only diffs', () => {
    const result = runChecker({ runtime: false, covered: 0, total: 2 })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('No changed runtime lines')
  })

  it('maps added line numbers and ignores non-runtime files', () => {
    const diff = [
      'diff --git a/components/sample.tsx b/components/sample.tsx',
      '--- a/components/sample.tsx',
      '+++ b/components/sample.tsx',
      '@@ -1,2 +1,3 @@',
      ' const before = 1',
      '+const added = 2',
      ' const after = 3',
      'diff --git a/docs/sample.md b/docs/sample.md',
      '--- a/docs/sample.md',
      '+++ b/docs/sample.md',
      '@@ -0,0 +1 @@',
      '+# New docs',
    ].join('\n')

    expect(isRuntimeSourcePath('components/sample.tsx')).toBe(true)
    expect(isRuntimeSourcePath('scripts/testing/sample.test.ts')).toBe(false)
    expect([...(parseUnifiedDiff(diff).get('components/sample.tsx') ?? [])]).toEqual([2])
    expect(parseUnifiedDiff(diff).has('docs/sample.md')).toBe(false)
  })

  it('counts missing coverage records as uncovered changes', () => {
    const changedLines = new Map([['components/new-file.ts', new Set([1, 2])]])
    const summary = calculateDiffCoverage(changedLines, new Map(), '/repo')

    expect(summary).toEqual({ covered: 0, total: 2, percentage: 0 })
  })

  it('parses LCOV hits and returns a clear argument error', () => {
    const coverage = parseLcov('SF:components/sample.ts\nDA:1,1\nDA:2,0\nend_of_record', '/repo')
    const summary = calculateDiffCoverage(
      new Map([['components/sample.ts', new Set([1, 2])]]),
      coverage,
      '/repo'
    )
    const invalid = run(['--threshold', '101'])

    expect(summary).toEqual({ covered: 1, total: 2, percentage: 50 })
    expect(invalid.exitCode).toBe(2)
    expect(invalid.stderr).toContain('--threshold must be a number between 0 and 100')
  })
})
