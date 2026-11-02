import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectYarnAuditOutput } from './lib/yarn-audit-gate.mjs'

export function runYarnAudit(spawn = spawnSync) {
  const result = spawn('yarn', ['audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === 'win32',
  })

  if (result.error) {
    console.error(`Unable to run Yarn audit: ${result.error.message}`)
    return 1
  }

  if (result.status === null) {
    console.error(`Yarn audit terminated${result.signal ? ` by ${result.signal}` : ''}`)
    return 1
  }

  try {
    const audit = inspectYarnAuditOutput(result.stdout ?? '')
    const { counts } = audit
    console.log(
      `Yarn audit: ${counts.critical} Critical, ${counts.high} High, ${counts.moderate} Moderate, ${counts.low} Low`
    )

    if (audit.hasBlockingVulnerabilities) {
      for (const advisory of audit.blockingAdvisories) {
        console.error(
          `${advisory.severity.toUpperCase()}: ${advisory.moduleName} — ${advisory.title}`
        )
      }
      return 1
    }

    if (result.status !== 0 && counts.info + counts.low + counts.moderate === 0) {
      console.error(`Yarn audit exited unexpectedly with status ${result.status}`)
      if (result.stderr) console.error(result.stderr.trim())
      return 1
    }

    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    if (result.stderr) console.error(result.stderr.trim())
    return 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runYarnAudit()
}
