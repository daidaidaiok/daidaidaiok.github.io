import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('diff coverage command', () => {
  it('prints usage without requiring a GitHub environment', () => {
    const script = resolve(process.cwd(), 'scripts/check-diff-coverage.mjs')
    const result = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Usage:')
  })
})
