import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/codeql.yml'), 'utf8')

describe('CodeQL workflow contract', () => {
  it('runs on pull requests, base branch updates, and a scheduled refresh', () => {
    expect(workflow).toContain('pull_request:')
    expect(workflow).toContain('push:')
    expect(workflow).toContain('branches: [staging, main]')
    expect(workflow).toContain('schedule:')
  })

  it('analyzes JavaScript and TypeScript with the extended security query suite', () => {
    expect(workflow).toContain('github/codeql-action/init@v4')
    expect(workflow).toContain('github/codeql-action/analyze@v4')
    expect(workflow).toContain('languages: javascript-typescript')
    expect(workflow).toContain('queries: security-extended')
  })

  it('uses only the read and code-scanning upload permissions it needs', () => {
    expect(workflow).toContain('actions: read')
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('security-events: write')
    expect(workflow).not.toContain('pull-requests: write')
  })
})
