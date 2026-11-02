const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical']

export function inspectYarnAuditOutput(output) {
  const advisories = []
  let vulnerabilities

  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    let record

    try {
      record = JSON.parse(line)
    } catch {
      throw new Error(`Yarn audit emitted invalid JSON: ${line}`)
    }

    if (record.type === 'error') {
      throw new Error(`Yarn audit failed: ${JSON.stringify(record.data)}`)
    }

    if (record.type === 'auditAdvisory') {
      const advisory = record.data?.advisory
      if (!SEVERITIES.includes(advisory?.severity)) {
        throw new Error(`Yarn audit returned an unknown advisory severity: ${advisory?.severity}`)
      }

      advisories.push({
        moduleName: advisory.module_name ?? record.data?.resolution?.path ?? 'unknown package',
        severity: advisory.severity,
        title: advisory.title ?? 'Untitled advisory',
      })
    }

    if (record.type === 'auditSummary') {
      vulnerabilities = record.data?.vulnerabilities
    }
  }

  if (!vulnerabilities) {
    throw new Error('Yarn audit returned no vulnerability summary')
  }

  const counts = Object.fromEntries(
    SEVERITIES.map((severity) => {
      const count = vulnerabilities[severity]
      if (!Number.isInteger(count) || count < 0) {
        throw new Error(`Yarn audit returned an invalid ${severity} count: ${count}`)
      }
      return [severity, count]
    })
  )

  const blockingAdvisories = advisories.filter(({ severity }) =>
    ['high', 'critical'].includes(severity)
  )

  return {
    counts,
    blockingAdvisories,
    hasBlockingVulnerabilities: counts.high > 0 || counts.critical > 0,
  }
}
