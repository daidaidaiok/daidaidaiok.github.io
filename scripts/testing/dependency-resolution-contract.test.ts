import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const rootRequire = createRequire(resolve(root, 'package.json'))
const yarnLock = readFileSync(resolve(root, 'yarn.lock'), 'utf8')
const picomatchLockVersions = yarnLock
  .split(/\n\s*\n/)
  .filter((block) => /^picomatch@/.test(block))
  .map((block) => block.match(/^ {2}version "([^"]+)"/m)?.[1])
  .filter((version): version is string => Boolean(version))

describe('Yarn dependency resolution contract', () => {
  it('keeps root and Vite/Vitest picomatch resolutions on their intended versions', () => {
    const viteRequire = createRequire(rootRequire.resolve('vite/package.json'))
    const micromatchRequire = createRequire(rootRequire.resolve('micromatch/package.json'))

    expect(picomatchLockVersions).toContain('2.3.2')
    expect(picomatchLockVersions).toContain('4.0.7')
    expect(viteRequire('picomatch/package.json').version).toBe('4.0.7')
    expect(micromatchRequire('picomatch/package.json').version).toBe('2.3.2')
  })

  it('keeps debug optional color support resolvable for Superagent builds', () => {
    const superagentRequire = createRequire(rootRequire.resolve('superagent/package.json'))
    const debugRequire = createRequire(superagentRequire.resolve('debug/package.json'))

    expect(() => debugRequire.resolve('supports-color')).not.toThrow()
  })
})
