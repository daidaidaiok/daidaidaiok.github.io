import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const yarnLock = readFileSync(resolve(process.cwd(), 'yarn.lock'), 'utf8')

describe('Yarn dependency resolution contract', () => {
  it('keeps root and Vite/Vitest picomatch resolutions on their intended versions', () => {
    expect(yarnLock).toMatch(/^picomatch@2\.3\.2,.*:\n {2}version "2\.3\.2"/m)
    expect(yarnLock).toMatch(/^picomatch@4\.0\.7,.*:\n {2}version "4\.0\.7"/m)
  })
})
