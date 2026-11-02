import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/content-validation.yml'),
  'utf8'
)

describe('Content and RSS validation workflow', () => {
  it('exports the static site and RSS feed before checking built content', () => {
    const buildStep =
      workflow.match(/- name: Build static export([\s\S]*?)(?=\n {6}- name:|$)/)?.[0] ?? ''
    const builtValidationIndex = workflow.indexOf('run: yarn validate:content:built')

    expect(buildStep).toContain("EXPORT: '1'")
    expect(buildStep).toContain("UNOPTIMIZED: '1'")
    expect(builtValidationIndex).toBeGreaterThan(workflow.indexOf(buildStep))
  })
})
