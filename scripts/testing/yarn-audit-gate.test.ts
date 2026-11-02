import { describe, expect, it } from 'vitest'
import { inspectYarnAuditOutput } from '../lib/yarn-audit-gate.mjs'

function auditRecord(type: string, data: unknown): string {
  return JSON.stringify({ type, data })
}

function auditSummary(counts: Record<string, number>): string {
  return auditRecord('auditSummary', { vulnerabilities: counts })
}

describe('Yarn audit severity gate', () => {
  it('passes when the only findings are below High severity', () => {
    const output = [
      auditRecord('auditAdvisory', {
        advisory: { module_name: 'example', severity: 'moderate', title: 'Moderate advisory' },
      }),
      auditSummary({ info: 0, low: 9, moderate: 23, high: 0, critical: 0 }),
    ].join('\n')

    expect(inspectYarnAuditOutput(output)).toMatchObject({
      counts: { low: 9, moderate: 23, high: 0, critical: 0 },
      blockingAdvisories: [],
      hasBlockingVulnerabilities: false,
    })
  })

  it('blocks High and Critical findings and reports their package names', () => {
    const output = [
      auditRecord('auditAdvisory', {
        advisory: { module_name: 'high-package', severity: 'high', title: 'High advisory' },
      }),
      auditRecord('auditAdvisory', {
        advisory: {
          module_name: 'critical-package',
          severity: 'critical',
          title: 'Critical advisory',
        },
      }),
      auditSummary({ info: 0, low: 0, moderate: 0, high: 1, critical: 1 }),
    ].join('\n')

    expect(inspectYarnAuditOutput(output)).toMatchObject({
      blockingAdvisories: [
        { moduleName: 'high-package', severity: 'high' },
        { moduleName: 'critical-package', severity: 'critical' },
      ],
      hasBlockingVulnerabilities: true,
    })
  })

  it('fails closed when the audit output is incomplete or malformed', () => {
    expect(() => inspectYarnAuditOutput('')).toThrow('no vulnerability summary')
    expect(() => inspectYarnAuditOutput('{invalid json')).toThrow('invalid JSON')
    expect(() => inspectYarnAuditOutput(auditSummary({ low: 0 }))).toThrow('invalid info count')
  })
})
