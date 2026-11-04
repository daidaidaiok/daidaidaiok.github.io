import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

const vitestConfig = readFileSync(resolve(process.cwd(), 'vitest.config.mts'), 'utf8')

function JsxFixture() {
  return <span data-testid="rolldown-jsx">TSX transform works</span>
}

describe('Vite 8 Rolldown JSX transform contract', () => {
  it('selects the automatic JSX runtime through the Oxc transform', () => {
    expect(vitestConfig).toMatch(/oxc:\s*{[\s\S]*jsx:\s*{[\s\S]*runtime:\s*['"]automatic['"]/)
  })

  it('transforms a TSX fixture and renders it with the automatic runtime', () => {
    expect(renderToStaticMarkup(<JsxFixture />)).toBe(
      '<span data-testid="rolldown-jsx">TSX transform works</span>'
    )
  })
})
