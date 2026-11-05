import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { run, validateImageBudget } from '../check-image-budget.mjs'

const temporaryDirectories: string[] = []

function git(root: string, ...args: string[]) {
  return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
}

function createFixture(
  exceptions: unknown[] = [],
  baselineAssets: Array<{ path: string; size: number }> = []
) {
  const root = mkdtempSync(join(tmpdir(), 'hpb-image-budget-'))
  temporaryDirectories.push(root)
  git(root, 'init', '-b', 'main')
  git(root, 'config', 'user.name', 'Image Budget Test')
  git(root, 'config', 'user.email', 'image-budget@example.test')
  mkdirSync(join(root, 'scripts'), { recursive: true })
  writeFileSync(
    join(root, 'scripts/image-budget-exceptions.json'),
    `${JSON.stringify({ exceptions }, null, 2)}\n`
  )
  for (const asset of baselineAssets) {
    const assetPath = join(root, asset.path)
    mkdirSync(join(assetPath, '..'), { recursive: true })
    writeFileSync(assetPath, Buffer.alloc(asset.size, 0x61))
  }
  git(root, 'add', '.')
  git(root, 'commit', '-m', 'baseline')
  return { root, base: git(root, 'rev-parse', 'HEAD') }
}

function addAsset(root: string, path: string, size: number) {
  const assetPath = join(root, path)
  mkdirSync(join(assetPath, '..'), { recursive: true })
  writeFileSync(assetPath, Buffer.alloc(size, 0x61))
  git(root, 'add', path)
  git(root, 'commit', '-m', `add ${path}`)
}

function runBudget(fixture: ReturnType<typeof createFixture>) {
  return run([
    '--base',
    fixture.base,
    '--root',
    fixture.root,
    '--exceptions-file',
    'scripts/image-budget-exceptions.json',
  ])
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('new image asset budget', () => {
  it('allows a new PNG exactly at the 500,000-byte budget', () => {
    const fixture = createFixture()
    addAsset(fixture.root, 'public/static/images/exact.png', 500_000)

    const result = runBudget(fixture)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Image budget passed')
  })

  it('fails a newly added JPG one byte above the budget', () => {
    const fixture = createFixture()
    addAsset(fixture.root, 'public/static/images/too-large.jpg', 500_001)

    const result = runBudget(fixture)

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('public/static/images/too-large.jpg')
    expect(result.stderr).toContain('500001 bytes')
    expect(result.stderr).toContain('500000-byte budget')
  })

  it('does not fail on an oversized image already present in the base revision', () => {
    const fixture = createFixture()
    addAsset(fixture.root, 'public/static/images/existing.jpg', 600_000)
    fixture.base = git(fixture.root, 'rev-parse', 'HEAD')

    const result = runBudget(fixture)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('No changed PNG/JPG/JPEG assets')
  })

  it('keeps a valid exception for an unchanged oversized repository image', () => {
    const fixture = createFixture(
      [
        {
          path: 'public/static/images/legacy.jpg',
          reason: 'Source cannot be recompressed further',
        },
      ],
      [{ path: 'public/static/images/legacy.jpg', size: 600_000 }]
    )

    const result = runBudget(fixture)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('No changed PNG/JPG/JPEG assets')
  })

  it('allows an oversized new image only for its exact path with a reason', () => {
    const fixture = createFixture([
      { path: 'public/static/images/waived.png', reason: 'Required source artwork' },
    ])
    addAsset(fixture.root, 'public/static/images/waived.png', 500_001)

    const result = runBudget(fixture)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Required source artwork')
  })

  it('rejects wildcard allowlist paths and stale exceptions', () => {
    const wildcard = createFixture([{ path: 'public/static/images/*.png', reason: 'Too broad' }])
    const stale = createFixture([
      { path: 'public/static/images/removed.jpg', reason: 'No longer needed' },
    ])

    expect(runBudget(wildcard)).toEqual(
      expect.objectContaining({
        exitCode: 2,
        stderr: expect.stringContaining('exact repository-relative path'),
      })
    )
    expect(runBudget(stale)).toEqual(
      expect.objectContaining({
        exitCode: 1,
        stderr: expect.stringContaining('stale image exception'),
      })
    )
  })

  it('rejects malformed exception entries and duplicate paths', () => {
    const missingPath = createFixture([{ reason: 'No path' }])
    const unsupportedExtension = createFixture([
      { path: 'public/static/images/asset.webp', reason: 'Wrong extension' },
    ])
    const missingReason = createFixture([{ path: 'public/static/images/asset.png', reason: '  ' }])
    const duplicate = createFixture([
      { path: 'public/static/images/asset.png', reason: 'First reason' },
      { path: 'public/static/images/asset.png', reason: 'Second reason' },
    ])

    expect(runBudget(missingPath).stderr).toContain('must include an exact path')
    expect(runBudget(unsupportedExtension).stderr).toContain('must target PNG/JPG/JPEG')
    expect(runBudget(missingReason).stderr).toContain('must include a reason')
    expect(runBudget(duplicate).stderr).toContain('duplicate exception path')
  })

  it('rejects invalid thresholds and image paths outside the repository', () => {
    const fixture = createFixture()

    expect(run(['--base', fixture.base, '--budget-bytes', '0'])).toEqual(
      expect.objectContaining({
        exitCode: 2,
        stderr: expect.stringContaining('positive integer'),
      })
    )
    expect(
      validateImageBudget({ root: fixture.root, changedFiles: ['../outside.png'] }).errors
    ).toContain('Image path is outside the repository: ../outside.png')
  })

  it('reports malformed image exception JSON', () => {
    const fixture = createFixture()
    writeFileSync(join(fixture.root, 'scripts/image-budget-exceptions.json'), '{ invalid json')

    const result = runBudget(fixture)

    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('invalid JSON')
    expect(result.stderr).toContain('Usage:')
  })

  it('ignores large non-image files and reports missing CLI arguments', () => {
    const fixture = createFixture()
    addAsset(fixture.root, 'public/static/images/video.mp4', 700_000)

    expect(runBudget(fixture).exitCode).toBe(0)
    expect(run([])).toEqual(
      expect.objectContaining({ exitCode: 2, stderr: expect.stringContaining('Provide --base') })
    )
  })
})
