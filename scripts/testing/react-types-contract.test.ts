import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const packageManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const nextPackage = JSON.parse(
  readFileSync(resolve(root, 'node_modules/next/package.json'), 'utf8')
)

function major(version: string) {
  return Number(version.match(/^\d+/)?.[0])
}

describe('React 19 runtime and type compatibility contract', () => {
  it('uses the same React 19 version for react and react-dom', () => {
    const reactVersion = packageManifest.dependencies.react

    expect(major(reactVersion)).toBe(19)
    expect(packageManifest.dependencies['react-dom']).toBe(reactVersion)
  })

  it('aligns React type packages and preserves Next 16 stable React 19 peer support', () => {
    const reactVersion = packageManifest.dependencies.react
    const reactTypesVersion = packageManifest.devDependencies['@types/react']
    const reactDomTypesVersion = packageManifest.devDependencies['@types/react-dom']

    expect(major(reactTypesVersion)).toBe(19)
    expect(major(reactDomTypesVersion)).toBe(19)
    expect(nextPackage.peerDependencies.react).toContain('^19.0.0')
    expect(nextPackage.peerDependencies['react-dom']).toContain('^19.0.0')
    expect(major(reactVersion)).toBe(major(reactTypesVersion))
  })
})
