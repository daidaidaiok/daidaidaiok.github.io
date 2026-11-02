import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}
const pagesWorkflow = readFileSync(resolve(process.cwd(), '.github/workflows/nextjs.yml'), 'utf8')
const qualityWorkflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/quality.yml'),
  'utf8'
)

describe('test runner contract', () => {
  it('exposes deterministic local and coverage commands', () => {
    expect(packageJson.scripts.test).toBe('vitest run')
    expect(packageJson.scripts['test:coverage']).toBe('vitest run --coverage')
  })

  it('uses Node 24 for the Pages build', () => {
    expect(pagesWorkflow).toMatch(/node-version:\s*["']?24/)
  })

  it('passes the PR base through an environment variable to the coverage command', () => {
    expect(qualityWorkflow).toContain('BASE_REF: ${{ github.base_ref }}')
    expect(qualityWorkflow).toContain('--base "origin/$BASE_REF"')
    expect(qualityWorkflow).not.toContain('--base "origin/${{ github.base_ref }}"')
  })
})
