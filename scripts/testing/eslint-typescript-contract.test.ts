import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const rootRequire = createRequire(resolve(root, 'package.json'))
const tsconfig = JSON.parse(readFileSync(resolve(root, 'tsconfig.json'), 'utf8')) as {
  compilerOptions: { baseUrl?: string; paths: Record<string, string[]> }
}
const jsconfig = JSON.parse(readFileSync(resolve(root, 'jsconfig.json'), 'utf8')) as {
  compilerOptions: { baseUrl?: string; paths: Record<string, string[]> }
}
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  devDependencies: Record<string, string>
}

function readInstalledPackage(name: string) {
  return JSON.parse(readFileSync(rootRequire.resolve(`${name}/package.json`), 'utf8')) as {
    version: string
    peerDependencies?: Record<string, string>
  }
}

describe('ESLint and TypeScript compatibility contract', () => {
  it('keeps ESLint 10 paired with the supported TypeScript 6 compiler', () => {
    const eslint = readInstalledPackage('eslint')
    const eslintJs = readInstalledPackage('@eslint/js')
    const typescript = readInstalledPackage('typescript')
    const parser = readInstalledPackage('@typescript-eslint/parser')
    const plugin = readInstalledPackage('@typescript-eslint/eslint-plugin')

    expect(packageJson.devDependencies.eslint).toMatch(/^\^?10\./)
    expect(packageJson.devDependencies['@eslint/js']).toMatch(/^\^?10\./)
    expect(packageJson.devDependencies.typescript).toMatch(/^\^?6\./)
    expect(eslint.version).toMatch(/^10\./)
    expect(eslintJs.version).toMatch(/^10\./)
    expect(typescript.version).toMatch(/^6\./)
    expect(parser.peerDependencies?.eslint).toContain('^10.0.0')
    expect(parser.peerDependencies?.typescript).toContain('<6.1.0')
    expect(plugin.peerDependencies?.typescript).toContain('<6.1.0')
  })

  it('keeps path aliases without the TypeScript 6-deprecated baseUrl option', () => {
    expect(tsconfig.compilerOptions).not.toHaveProperty('baseUrl')
    expect(jsconfig.compilerOptions).not.toHaveProperty('baseUrl')
    expect(
      Object.values(tsconfig.compilerOptions.paths)
        .flat()
        .every((path) => path.startsWith('./'))
    ).toBe(true)
    expect(
      Object.values(jsconfig.compilerOptions.paths)
        .flat()
        .every((path) => path.startsWith('./'))
    ).toBe(true)
    expect(tsconfig.compilerOptions.paths['app/*']).toEqual(['./app/*'])
    expect(jsconfig.compilerOptions.paths['app/*']).toEqual(['./app/*'])
    expect(tsconfig.compilerOptions.paths['css/*']).toEqual(['./css/*'])
    expect(jsconfig.compilerOptions.paths['css/*']).toEqual(['./css/*'])
  })
})
