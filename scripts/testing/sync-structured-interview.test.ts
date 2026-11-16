// @vitest-environment node
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const defaultSourceDir =
  '/Users/lijunfeng/Library/Mobile Documents/iCloud~md~obsidian/Documents/咖喱gaygay/32 - 结构化面试'
const fixtureParent = execFileSync(
  'git',
  ['rev-parse', '--path-format=absolute', '--git-path', 'sync-structured-interview-test-fixtures'],
  { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8' }
).trim()
let createdFixtureParent = false
let fixtureRoot: string
let sourceDir: string
let workspaceDir: string
let targetDir: string
let targetSlidesDir: string

beforeAll(() => {
  createdFixtureParent = mkdirSync(fixtureParent, { recursive: true }) !== undefined
})

beforeEach(() => {
  fixtureRoot = mkdtempSync(join(fixtureParent, 'sync-fixtures-'))
  sourceDir = join(fixtureRoot, 'source')
  workspaceDir = join(fixtureRoot, 'workspace')
  targetDir = join(workspaceDir, 'data', 'gongkao', 'structured-interview')
  targetSlidesDir = join(workspaceDir, 'public', 'gongkao', 'structured-interview-slides')
  mkdirSync(join(sourceDir, 'slides'), { recursive: true })
  mkdirSync(workspaceDir, { recursive: true })
  vi.stubEnv('STRUCTURED_INTERVIEW_SOURCE_DIR', sourceDir)
  vi.spyOn(process, 'cwd').mockReturnValue(workspaceDir)
  vi.resetModules()
  vi.doMock('fs', async () => {
    const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs')
    return {
      ...actualFs,
      // Protect the real Obsidian directory even when a regression ignores the override.
      readdirSync: (...args: Parameters<typeof actualFs.readdirSync>) =>
        args[0] === defaultSourceDir ? [] : actualFs.readdirSync(...args),
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.doUnmock('fs')
  vi.resetModules()
  const paths = [
    fixtureRoot,
    ...readdirSync(fixtureRoot, { recursive: true }).map((entry) => join(fixtureRoot, entry)),
  ]
  console.log(`[dry-run] Remove owned sync fixture:\n${paths.join('\n')}`)
  rmSync(fixtureRoot, { recursive: true, force: true })
  expect(existsSync(fixtureRoot)).toBe(false)
})

afterAll(() => {
  const remaining = readdirSync(fixtureParent)
  console.log(`[cleanup scan] ${fixtureParent}: ${remaining.length} remaining entries`)
  expect(remaining).toEqual([])
  if (createdFixtureParent) {
    console.log(`[dry-run] Remove owned empty fixture parent: ${fixtureParent}`)
    rmdirSync(fixtureParent)
    expect(existsSync(fixtureParent)).toBe(false)
  }
})

describe('structured interview sync', () => {
  it('uses the configured source to generate national-exam metadata and refresh matching slides', async () => {
    const basename = '2026-11-16_2025-03-01_国考_税务局_第一题_如何服务群众'
    writeFileSync(join(sourceDir, `${basename}.md`), '# 题目\n\n回答正文。\n')
    writeFileSync(join(sourceDir, 'ignored.txt'), 'This is not an interview.')
    const slides = '<!doctype html><html><body>演示文稿</body></html>\n'
    writeFileSync(join(sourceDir, 'slides', `${basename}.html`), slides)
    writeFileSync(join(sourceDir, 'slides', 'orphan.html'), 'No matching markdown.')
    mkdirSync(targetSlidesDir, { recursive: true })
    writeFileSync(join(targetSlidesDir, 'stale.html'), 'Stale slide.')

    await import('../sync-structured-interview.mjs')

    expect(readdirSync(targetDir)).toEqual([`${basename}.mdx`])
    expect(readFileSync(join(targetDir, `${basename}.mdx`), 'utf8')).toBe(`---
title: '2025-03-01 国考 税务局 第一题 如何服务群众'
date: '2026-11-16'
tags:
  - 结构化面试
  - 真题
  - 考公
  - 国考
exam_date: '2025-03-01'
exam_region: '国考 税务局'
exam_type: '公务员'
authenticity: '中'
---

# 题目

回答正文。
`)
    expect(readdirSync(targetSlidesDir)).toEqual([`${basename}.html`])
    expect(readFileSync(join(targetSlidesDir, `${basename}.html`), 'utf8')).toBe(slides)
  })

  it('preserves existing frontmatter verbatim and does not require a slide', async () => {
    const content = `---
title: '原始标题'
date: '2026-10-01'
tags: ['自定义']
draft: true
---

已有正文，保留格式。\n`
    writeFileSync(join(sourceDir, 'existing.md'), content)
    mkdirSync(targetDir, { recursive: true })
    writeFileSync(join(targetDir, 'retained.mdx'), 'Previously synced content.')

    await import('../sync-structured-interview.mjs')

    expect(readdirSync(targetDir).sort()).toEqual(['existing.mdx', 'retained.mdx'])
    expect(readFileSync(join(targetDir, 'existing.mdx'), 'utf8')).toBe(content)
    expect(readFileSync(join(targetDir, 'retained.mdx'), 'utf8')).toBe('Previously synced content.')
    expect(readdirSync(targetSlidesDir)).toEqual([])
  })

  it('derives provincial and unclassified metadata without putting question text in the region', async () => {
    writeFileSync(join(sourceDir, '2026-11-15_2025-04-12_四川省考_应急管理.md'), '省考正文。\n')
    writeFileSync(join(sourceDir, '2026-11-14_2024-05-06_北京市_组织活动.md'), '地区正文。\n')

    await import('../sync-structured-interview.mjs')

    expect(readdirSync(targetDir).sort()).toEqual([
      '2026-11-14_2024-05-06_北京市_组织活动.mdx',
      '2026-11-15_2025-04-12_四川省考_应急管理.mdx',
    ])
    const provincial = readFileSync(
      join(targetDir, '2026-11-15_2025-04-12_四川省考_应急管理.mdx'),
      'utf8'
    )
    expect(provincial).toContain("title: '2025-04-12 四川省考 应急管理'")
    expect(provincial).toContain("exam_region: '四川省考'")
    expect(provincial).toContain('  - 省考\n')
    expect(provincial).toContain('\n省考正文。\n')
    const regional = readFileSync(
      join(targetDir, '2026-11-14_2024-05-06_北京市_组织活动.mdx'),
      'utf8'
    )
    expect(regional).toContain("title: '2024-05-06 北京市 组织活动'")
    expect(regional).toContain("exam_region: '北京市'")
    expect(regional).not.toMatch(/ {2}- (国考|省考)\n/)
    expect(regional).toContain('\n地区正文。\n')
  })
})
