import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  run,
  validateFrontmatter,
  validateLocalLinks,
  validateRssFeed,
  validateSiteMetadata,
} from '../validate-content.mjs'

const temporaryDirectories: string[] = []
const validator = resolve(process.cwd(), 'scripts/validate-content.mjs')
const metadata = {
  title: 'HPB300',
  author: 'Author',
  description: 'A test blog',
  language: 'zh-cn',
  siteUrl: 'https://example.test',
  email: 'author@example.test',
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'hpb-content-validator-'))
  temporaryDirectories.push(root)
  const contentRoot = join(root, 'data')
  const outDir = join(root, 'out')
  const metadataFile = join(root, 'site-metadata.json')
  mkdirSync(join(contentRoot, 'blog'), { recursive: true })
  mkdirSync(outDir, { recursive: true })
  writeFileSync(metadataFile, JSON.stringify(metadata))
  return { root, contentRoot, outDir, metadataFile }
}

function runValidator(
  fixture: ReturnType<typeof createFixture>,
  mode: 'frontmatter' | 'links' | 'rss' | 'built' | 'all'
) {
  return run([
    '--mode',
    mode,
    '--content-root',
    fixture.contentRoot,
    '--out-dir',
    fixture.outDir,
    '--metadata-file',
    fixture.metadataFile,
    '--repo-root',
    fixture.root,
  ])
}

function writeValidPost(contentRoot: string, body: string) {
  writeFileSync(
    join(contentRoot, 'blog/post.mdx'),
    `---\ntitle: Link test\ndate: 2026-01-02\n---\n${body}\n`
  )
}

function writeValidFeed(outDir: string) {
  writeFileSync(
    join(outDir, 'feed.xml'),
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HPB300</title>
    <link>https://example.test/blog</link>
    <description>A test blog</description>
    <language>zh-cn</language>
    <managingEditor>author@example.test (Author)</managingEditor>
    <webMaster>author@example.test (Author)</webMaster>
    <lastBuildDate>Mon, 02 Nov 2026 00:00:00 GMT</lastBuildDate>
    <atom:link href="https://example.test/feed.xml" rel="self" type="application/rss+xml"/>
    <item>
      <guid>https://example.test/blog/post</guid>
      <title>Link test</title>
      <link>https://example.test/blog/post</link>
      <pubDate>Mon, 02 Nov 2026 00:00:00 GMT</pubDate>
      <author>author@example.test (Author)</author>
    </item>
  </channel>
</rss>
`
  )
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('content validator CLI', () => {
  it('reports a missing required frontmatter field with a source location', () => {
    const fixture = createFixture()
    writeFileSync(
      join(fixture.contentRoot, 'blog/missing-title.mdx'),
      '---\ndate: 2026-01-02\n---\nBody.\n'
    )

    const result = runValidator(fixture, 'frontmatter')

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('data/blog/missing-title.mdx:3')
    expect(result.stderr).toContain('missing required frontmatter field "title"')
  })

  it('reports an invalid internal link with the MDX source line', () => {
    const fixture = createFixture()
    writeValidPost(fixture.contentRoot, 'See [missing](/blog/not-found/).')

    const result = runValidator(fixture, 'links')

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('data/blog/post.mdx:5')
    expect(result.stderr).toContain('internal link target not found: /blog/not-found/')
  })

  it('fails on missing RSS channel metadata and identifies the feed', () => {
    const fixture = createFixture()
    writeFileSync(
      join(fixture.outDir, 'feed.xml'),
      `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HPB300</title>
    <link>https://example.test/blog</link>
    <language>zh-cn</language>
    <managingEditor>author@example.test (Author)</managingEditor>
    <webMaster>author@example.test (Author)</webMaster>
    <lastBuildDate>Mon, 02 Nov 2026 00:00:00 GMT</lastBuildDate>
    <atom:link href="https://example.test/feed.xml" rel="self" type="application/rss+xml"/>
  </channel>
</rss>
`
    )

    const result = runValidator(fixture, 'rss')

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('out/feed.xml:')
    expect(result.stderr).toContain('missing RSS field <description>')
  })

  it('locates RSS item errors on the matching item and field lines', () => {
    const fixture = createFixture()
    writeValidFeed(fixture.outDir)
    const feedPath = join(fixture.outDir, 'feed.xml')
    const xml = readFileSync(feedPath, 'utf8').replace(
      '  </channel>',
      `    <item>\n      <guid>https://example.test/blog/second</guid>\n      <title>Second</title>\n      <link>https://example.test/blog/second</link>\n      <pubDate>not-a-date</pubDate>\n    </item>\n  </channel>`
    )
    writeFileSync(feedPath, xml)

    const errors = validateRssFeed(feedPath, xml, fixture.root)

    expect(errors).toContainEqual(
      expect.objectContaining({ line: 18, message: 'RSS item 2 is missing <author>' })
    )
    expect(errors).toContainEqual(
      expect.objectContaining({ line: 22, message: 'RSS item 2 has an invalid <pubDate>' })
    )
  })

  it('accepts valid frontmatter, site links, and RSS metadata', () => {
    const fixture = createFixture()
    writeValidPost(fixture.contentRoot, 'See [known](/blog/known/).')
    mkdirSync(join(fixture.outDir, 'blog/known'), { recursive: true })
    writeFileSync(join(fixture.outDir, 'blog/known/index.html'), '<html></html>')
    writeValidFeed(fixture.outDir)

    const result = runValidator(fixture, 'all')

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Content and RSS validation passed')
  })

  it('uses the configured site URL when resolving absolute same-site links', () => {
    const fixture = createFixture()
    writeValidPost(fixture.contentRoot, 'See [missing](https://example.test/blog/not-found/).')

    const result = runValidator(fixture, 'links')

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain(
      'internal link target not found: https://example.test/blog/not-found/'
    )
  })

  it('uses file and line diagnostics for invalid dates and site metadata', () => {
    const fixture = createFixture()
    const invalidDate = validateFrontmatter(
      join(fixture.contentRoot, 'blog/invalid-date.mdx'),
      '---\ntitle: Invalid date\ndate: not-a-date\n---\nBody.\n',
      fixture.contentRoot,
      fixture.root
    )
    const metadataSource = '{\n  "siteUrl": "ftp://example.test",\n  "email": "invalid"\n}'
    const invalidMetadata = validateSiteMetadata(
      { ...metadata, siteUrl: 'ftp://example.test', email: 'invalid' },
      fixture.metadataFile,
      metadataSource,
      fixture.root
    )

    expect(invalidDate).toEqual([
      expect.objectContaining({
        file: 'data/blog/invalid-date.mdx',
        line: 3,
        message: expect.stringContaining('valid date'),
      }),
    ])
    expect(invalidMetadata).toHaveLength(2)
    expect(invalidMetadata[0]).toEqual(
      expect.objectContaining({ line: 2, message: expect.stringContaining('siteUrl') })
    )
    expect(invalidMetadata[1]).toEqual(
      expect.objectContaining({ line: 3, message: expect.stringContaining('email') })
    )
  })

  it('reports missing and malformed frontmatter at the source start', () => {
    const fixture = createFixture()
    const filePath = join(fixture.contentRoot, 'blog/no-frontmatter.mdx')
    const missing = validateFrontmatter(
      filePath,
      'Body without frontmatter.\n',
      fixture.contentRoot
    )
    const malformed = validateFrontmatter(
      filePath,
      '---\ntitle: [unterminated\ndate: 2026-01-02\n---\nBody.\n',
      fixture.contentRoot
    )

    expect(missing[0]).toEqual(
      expect.objectContaining({ line: 1, message: 'missing YAML frontmatter block' })
    )
    expect(malformed[0]).toEqual(
      expect.objectContaining({ line: 1, message: expect.stringContaining('invalid YAML') })
    )
  })

  it('validates JSX href and src attributes as internal links', () => {
    const fixture = createFixture()
    writeValidPost(
      fixture.contentRoot,
      '<a href="/blog/missing/">Missing</a>\n\n<img src="/static/missing.png" />'
    )

    const result = runValidator(fixture, 'links')

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain(
      'data/blog/post.mdx:5: internal link target not found: /blog/missing/'
    )
    expect(result.stderr).toContain(
      'data/blog/post.mdx:7: internal link target not found: /static/missing.png'
    )
  })

  it('reports missing static output and generated RSS files', () => {
    const fixture = createFixture()
    writeValidPost(fixture.contentRoot, 'Body.')
    rmSync(fixture.outDir, { recursive: true, force: true })

    const result = runValidator(fixture, 'built')

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('static export directory not found')
    expect(result.stderr).toContain('generated RSS feed not found')
  })

  it('returns usage diagnostics for invalid command-line arguments', () => {
    expect(run(['--unknown'])).toEqual(
      expect.objectContaining({ exitCode: 2, stderr: expect.stringContaining('Unknown option') })
    )
    expect(run(['--mode'])).toEqual(
      expect.objectContaining({ exitCode: 2, stderr: expect.stringContaining('Missing value') })
    )
    expect(run(['--mode', 'unsupported'])).toEqual(
      expect.objectContaining({
        exitCode: 2,
        stderr: expect.stringContaining('Unknown validation mode'),
      })
    )
    expect(run(['--help'])).toEqual(
      expect.objectContaining({ exitCode: 0, stdout: expect.stringContaining('Usage:') })
    )
  })

  it('ignores external URLs and reports malformed RSS XML', () => {
    const fixture = createFixture()
    writeValidPost(fixture.contentRoot, 'See [external](https://outside.example/path).')
    const linkErrors = validateLocalLinks(
      join(fixture.contentRoot, 'blog/post.mdx'),
      readFileSync(join(fixture.contentRoot, 'blog/post.mdx'), 'utf8'),
      {
        contentRoot: fixture.contentRoot,
        outDir: fixture.outDir,
        siteUrl: metadata.siteUrl,
        repoRoot: fixture.root,
      }
    )
    const rssErrors = validateRssFeed(
      join(fixture.outDir, 'feed.xml'),
      '<rss><channel></rss>',
      fixture.root
    )

    expect(linkErrors).toEqual([])
    expect(rssErrors[0]).toEqual(
      expect.objectContaining({
        file: 'out/feed.xml',
        line: 1,
        message: expect.stringContaining('invalid RSS XML'),
      })
    )
  })

  it('provides a standalone help entrypoint', () => {
    const result = spawnSync(process.execPath, [validator, '--help'], { encoding: 'utf8' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Usage: node scripts/validate-content.mjs')
  })
})
