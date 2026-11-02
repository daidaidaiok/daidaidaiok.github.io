import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const configPath = resolve(process.cwd(), '.github/dependabot.yml')
const config = readFileSync(configPath, 'utf8')
const policy = readFileSync(resolve(process.cwd(), 'docs/dependabot.md'), 'utf8')

describe('Dependabot update policy', () => {
  it('schedules npm/Yarn and GitHub Actions version updates on staging each week', () => {
    expect(config).toContain('version: 2')
    expect(config).toContain('package-ecosystem: npm')
    expect(config).toContain('package-ecosystem: github-actions')
    expect(config.match(/target-branch: staging/g)).toHaveLength(2)
    expect(config.match(/interval: weekly/g)).toHaveLength(2)
  })

  it('groups routine and major npm updates separately with a bounded PR queue', () => {
    expect(config).toContain('production-routine:')
    expect(config).toContain('development-routine:')
    expect(config).toContain('major-updates:')
    expect(config.match(/open-pull-requests-limit: 5/g)).toHaveLength(2)
    expect(config.match(/rebase-strategy: auto/g)).toHaveLength(2)
  })

  it('documents security-update priority and stale PR handling', () => {
    expect(policy).toContain('default branch (`main`)')
    expect(policy).toContain('automatically rebases')
    expect(policy).toContain('closes')
  })
})
