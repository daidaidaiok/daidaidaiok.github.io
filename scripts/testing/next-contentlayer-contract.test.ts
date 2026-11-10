import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const packageManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const nextConfig = readFileSync(resolve(root, 'next.config.js'), 'utf8')
const typeScriptConfig = JSON.parse(readFileSync(resolve(root, 'tsconfig.json'), 'utf8'))
const eslintConfig = readFileSync(resolve(root, 'eslint.config.mjs'), 'utf8')

describe('Next.js 16 Contentlayer compatibility contract', () => {
  it('aligns the Next.js package group while retaining the legacy React/Contentlayer peer set', () => {
    const nextVersion = packageManifest.dependencies.next

    expect(nextVersion).toBe('16.4.5')
    expect(packageManifest.dependencies['@next/bundle-analyzer']).toBe(nextVersion)
    expect(packageManifest.devDependencies['eslint-config-next']).toBe(nextVersion)
    expect(packageManifest.dependencies.contentlayer2).toBe('0.5.8')
    expect(packageManifest.dependencies['next-contentlayer2']).toBe('0.5.8')
  })

  it('uses Webpack for Next.js commands that invoke Contentlayer', () => {
    expect(packageManifest.scripts.start).toMatch(/next dev --webpack/)
    expect(packageManifest.scripts.dev).toMatch(/next dev --webpack/)
    expect(packageManifest.scripts.build).toContain('next build --webpack')
    expect(packageManifest.scripts.analyze).toContain('next build --webpack')
    expect(nextConfig).toContain('withContentlayer')
  })

  it('uses the ESLint CLI after Next.js 16 removes next lint', () => {
    expect(packageManifest.scripts.lint).toMatch(/^eslint --fix /)
    expect(packageManifest.scripts.lint).not.toContain('next lint')
  })

  it('uses the automatic JSX runtime required by Next.js 16', () => {
    expect(typeScriptConfig.compilerOptions.jsx).toBe('react-jsx')
  })

  it('loads the Next.js 16 flat config instead of routing it through FlatCompat', () => {
    expect(eslintConfig).toContain("from 'eslint-config-next/core-web-vitals'")
    expect(eslintConfig).not.toContain("'next/core-web-vitals'")
  })

  it('scopes the new React Hooks rule exception to existing hydration gates', () => {
    expect(eslintConfig).toContain("'react-hooks/set-state-in-effect': 'off'")
    expect(eslintConfig).toContain('components/MobileNav.tsx')
    expect(eslintConfig).toContain('components/ThemeSwitch.tsx')
  })
})
