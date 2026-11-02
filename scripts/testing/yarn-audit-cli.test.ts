import { afterEach, describe, expect, it, vi } from 'vitest'
import { runYarnAudit } from '../check-yarn-audit.mjs'

function record(type: string, data: unknown): string {
  return JSON.stringify({ type, data })
}

function summary(counts: Record<string, number>): string {
  return record('auditSummary', { vulnerabilities: counts })
}

type AuditSpawnResult = {
  error?: Error
  output: [null, string | null, string | null]
  pid: number
  signal: NodeJS.Signals | null
  status: number | null
  stdout: string
  stderr: string
}

type AuditRunner = Parameters<typeof runYarnAudit>[0]

function result(
  stdout: string,
  status: number | null,
  overrides: Partial<AuditSpawnResult> = {}
): AuditSpawnResult {
  return {
    output: [null, stdout, ''],
    pid: 123,
    signal: null,
    status,
    stdout,
    stderr: '',
    ...overrides,
  }
}

function mockSpawn(output: AuditSpawnResult): AuditRunner {
  return vi.fn(() => output) as unknown as AuditRunner
}

describe('Yarn audit command wrapper', () => {
  afterEach(() => vi.restoreAllMocks())

  it('accepts Yarn’s non-zero status when only Low or Moderate findings exist', () => {
    const spawn = mockSpawn(
      result(summary({ info: 0, low: 2, moderate: 3, high: 0, critical: 0 }), 6)
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(runYarnAudit(spawn)).toBe(0)
    expect(spawn).toHaveBeenCalledWith(
      'yarn',
      ['audit', '--json'],
      expect.objectContaining({ encoding: 'utf8', shell: false })
    )
  })

  it('fails when High or Critical findings are present', () => {
    const stdout = [
      record('auditAdvisory', {
        advisory: { module_name: 'high-package', severity: 'high', title: 'High advisory' },
      }),
      summary({ info: 0, low: 0, moderate: 0, high: 1, critical: 0 }),
    ].join('\n')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(runYarnAudit(mockSpawn(result(stdout, 8)))).toBe(1)
  })

  it('fails when Yarn cannot run, is terminated, or returns unexpected status', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const spawnError = new Error('yarn is missing')
    expect(runYarnAudit(mockSpawn(result('', null, { error: spawnError })))).toBe(1)
    expect(runYarnAudit(mockSpawn(result('', null, { signal: 'SIGTERM' })))).toBe(1)
    expect(
      runYarnAudit(
        mockSpawn(result(summary({ info: 0, low: 0, moderate: 0, high: 0, critical: 0 }), 1))
      )
    ).toBe(1)
  })
})
