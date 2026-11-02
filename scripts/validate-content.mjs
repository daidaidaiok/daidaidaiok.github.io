import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import { remark } from 'remark'
import { visit } from 'unist-util-visit'
import siteMetadata from '../data/siteMetadata.js'

const COLLECTION_FIELDS = [
  { prefix: 'blog/', fields: ['title', 'date'] },
  { prefix: 'authors/', fields: ['name'] },
  { prefix: 'gongkao/structured-interview/', fields: ['title', 'date'] },
]
const REQUIRED_SITE_METADATA = ['title', 'author', 'description', 'language', 'siteUrl', 'email']
const RSS_CHANNEL_FIELDS = [
  'title',
  'link',
  'description',
  'language',
  'managingEditor',
  'webMaster',
  'lastBuildDate',
]
const RSS_ITEM_FIELDS = ['guid', 'title', 'link', 'pubDate', 'author']

function pathFromRoot(filePath, repoRoot) {
  const relativePath = relative(repoRoot, filePath)
  return (relativePath || filePath).split(sep).join('/')
}

function makeIssue(filePath, line, message, repoRoot) {
  return { file: pathFromRoot(filePath, repoRoot), line, message }
}

function collectFiles(directory, predicate) {
  if (!existsSync(directory)) return []
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectFiles(entryPath, predicate))
    else if (entry.isFile() && predicate(entryPath)) files.push(entryPath)
  }
  return files
}

function collectionFields(filePath, contentRoot) {
  const contentPath = relative(contentRoot, filePath).split(sep).join('/')
  return COLLECTION_FIELDS.find(({ prefix }) => contentPath.startsWith(prefix))?.fields ?? []
}

function parseFrontmatter(source) {
  const normalized = source.replace(/^\uFEFF/, '')
  const lines = normalized.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    return { error: 'missing YAML frontmatter block', line: 1 }
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && /^---\s*$/.test(line))
  if (closingIndex < 0) {
    return { error: 'unterminated YAML frontmatter block', line: 1 }
  }

  try {
    const parsed = matter(normalized)
    return {
      data: parsed.data,
      content: parsed.content,
      lines,
      closingLine: closingIndex + 1,
      bodyLineOffset: closingIndex + 1,
    }
  } catch (error) {
    return {
      error: `invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
      line: 1,
    }
  }
}

function fieldLine(frontmatter, field) {
  const index = frontmatter.lines.findIndex(
    (line, lineIndex) =>
      lineIndex > 0 &&
      lineIndex < frontmatter.closingLine - 1 &&
      new RegExp(`^\\s*${field}\\s*:`).test(line)
  )
  return index >= 0 ? index + 1 : frontmatter.closingLine
}

function isValidDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime())
  if (typeof value !== 'string' && typeof value !== 'number') return false
  return Number.isFinite(Date.parse(String(value)))
}

export function validateFrontmatter(filePath, source, contentRoot, repoRoot = process.cwd()) {
  const errors = []
  const fields = collectionFields(filePath, contentRoot)
  if (fields.length === 0) return errors

  const frontmatter = parseFrontmatter(source)
  if (frontmatter.error) {
    errors.push(makeIssue(filePath, frontmatter.line, frontmatter.error, repoRoot))
    return errors
  }

  for (const field of fields) {
    const value = frontmatter.data[field]
    const line = fieldLine(frontmatter, field)
    if (value === undefined || value === null) {
      errors.push(
        makeIssue(filePath, line, `missing required frontmatter field "${field}"`, repoRoot)
      )
    } else if (field === 'date' && !isValidDate(value)) {
      errors.push(
        makeIssue(filePath, line, 'frontmatter field "date" must be a valid date', repoRoot)
      )
    } else if (field !== 'date' && (typeof value !== 'string' || !value.trim())) {
      errors.push(
        makeIssue(
          filePath,
          line,
          `frontmatter field "${field}" must be a non-empty string`,
          repoRoot
        )
      )
    }
  }

  return errors
}

function routeForContentFile(filePath, contentRoot) {
  const contentPath = relative(contentRoot, filePath).split(sep).join('/')
  const withoutExtension = contentPath.replace(/\.mdx$/i, '')
  if (withoutExtension.startsWith('blog/')) return `/${withoutExtension}/`
  if (withoutExtension.startsWith('gongkao/structured-interview/')) return `/${withoutExtension}/`
  if (withoutExtension.startsWith('authors/')) return `/${withoutExtension}/`
  return '/'
}

function resolveLocalPath(href, { filePath, contentRoot, siteUrl }) {
  if (!href || /^(?:mailto|tel|data|javascript):/i.test(href)) return null
  const site = new URL(siteUrl)
  const baseRoute = routeForContentFile(filePath, contentRoot)
  const resolved = new URL(href, new URL(baseRoute, `${site.origin}/`))
  if (!['http:', 'https:'].includes(resolved.protocol) || resolved.origin !== site.origin)
    return null
  return decodeURIComponent(resolved.pathname)
}

function staticTargetExists(pathname, outDir) {
  const normalizedPath = posix.normalize(`/${pathname}`)
  const segments = normalizedPath.split('/').filter(Boolean)
  const target = resolve(outDir, ...segments)
  const relativeTarget = relative(outDir, target)
  if (relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) return false

  const candidates = [target]
  if (!extname(target)) {
    candidates.push(join(target, 'index.html'), join(target, 'index.txt'), `${target}.html`)
  }
  return candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile())
}

function mdxLinkNodes(source) {
  const frontmatter = parseFrontmatter(source)
  if (frontmatter.error) return { error: frontmatter.error, line: frontmatter.line, links: [] }
  const tree = remark().use(remarkGfm).use(remarkMdx).parse(frontmatter.content)
  const links = []
  visit(tree, (node) => {
    if ((node.type === 'link' || node.type === 'image') && typeof node.url === 'string') {
      links.push({
        url: node.url,
        line: frontmatter.bodyLineOffset + (node.position?.start.line ?? 1),
      })
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      for (const attribute of node.attributes ?? []) {
        if (
          attribute.type === 'mdxJsxAttribute' &&
          (attribute.name === 'href' || attribute.name === 'src') &&
          typeof attribute.value === 'string'
        ) {
          links.push({
            url: attribute.value,
            line:
              frontmatter.bodyLineOffset +
              (attribute.position?.start.line ?? node.position?.start.line ?? 1),
          })
        }
      }
    }
  })
  return { links }
}

export function validateLocalLinks(
  filePath,
  source,
  { contentRoot, outDir, siteUrl, repoRoot = process.cwd() }
) {
  const errors = []
  let parsed
  try {
    parsed = mdxLinkNodes(source)
  } catch (error) {
    errors.push(
      makeIssue(
        filePath,
        1,
        `unable to parse MDX links: ${error instanceof Error ? error.message : String(error)}`,
        repoRoot
      )
    )
    return errors
  }

  if (parsed.error) {
    errors.push(makeIssue(filePath, parsed.line, parsed.error, repoRoot))
    return errors
  }

  for (const link of parsed.links) {
    try {
      const pathname = resolveLocalPath(link.url, { filePath, contentRoot, siteUrl })
      if (pathname && !staticTargetExists(pathname, outDir)) {
        errors.push(
          makeIssue(filePath, link.line, `internal link target not found: ${link.url}`, repoRoot)
        )
      }
    } catch {
      errors.push(makeIssue(filePath, link.line, `invalid internal link: ${link.url}`, repoRoot))
    }
  }
  return errors
}

function lineFor(content, pattern, start = 0) {
  const match = content.slice(start).match(pattern)
  return match ? content.slice(0, start + match.index).split(/\r?\n/).length : 1
}

function metadataFieldLine(source, field) {
  const patterns = [new RegExp(`^\\s*${field}\\s*:`), new RegExp(`^\\s*"${field}"\\s*:`)]
  const lines = source.split(/\r?\n/)
  const index = lines.findIndex((line) => patterns.some((pattern) => pattern.test(line)))
  return index >= 0 ? index + 1 : 1
}

export function validateSiteMetadata(metadata, metadataFile, source, repoRoot = process.cwd()) {
  const errors = []
  for (const field of REQUIRED_SITE_METADATA) {
    const value = metadata[field]
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(
        makeIssue(
          metadataFile,
          metadataFieldLine(source, field),
          `required RSS metadata "${field}" must be non-empty`,
          repoRoot
        )
      )
    }
  }
  if (typeof metadata.siteUrl === 'string' && metadata.siteUrl) {
    try {
      const url = new URL(metadata.siteUrl)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
    } catch {
      errors.push(
        makeIssue(
          metadataFile,
          metadataFieldLine(source, 'siteUrl'),
          'RSS metadata "siteUrl" must be an absolute HTTP(S) URL',
          repoRoot
        )
      )
    }
  }
  if (
    typeof metadata.email === 'string' &&
    metadata.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(metadata.email)
  ) {
    errors.push(
      makeIssue(
        metadataFile,
        metadataFieldLine(source, 'email'),
        'RSS metadata "email" must be a valid email address',
        repoRoot
      )
    )
  }
  return errors
}

function childByName(parent, name) {
  return Array.from(parent.children).find(
    (element) => element.nodeName === name || element.localName === name
  )
}

function nonEmptyText(element) {
  return element?.textContent?.trim() ?? ''
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateRssFeed(feedPath, xml, repoRoot = process.cwd()) {
  const errors = []
  let document
  try {
    document = new JSDOM(xml, { contentType: 'application/xml' }).window.document
  } catch (error) {
    errors.push(
      makeIssue(
        feedPath,
        1,
        `invalid RSS XML: ${error instanceof Error ? error.message : String(error)}`,
        repoRoot
      )
    )
    return errors
  }

  if (document.getElementsByTagName('parsererror').length > 0) {
    errors.push(makeIssue(feedPath, 1, 'invalid RSS XML', repoRoot))
    return errors
  }

  const rss = document.documentElement
  if (rss?.localName !== 'rss') {
    errors.push(makeIssue(feedPath, 1, 'RSS document root must be <rss>', repoRoot))
    return errors
  }

  const channel = childByName(rss, 'channel')
  if (!channel) {
    errors.push(
      makeIssue(feedPath, lineFor(xml, /<rss\b/), 'RSS document is missing <channel>', repoRoot)
    )
    return errors
  }

  const channelStart = xml.search(/<channel\b/)
  const channelEnd = xml.indexOf('</channel>', channelStart)
  const channelLine = lineFor(xml, /<channel\b/)
  const channelSourceEnd = channelEnd < 0 ? xml.length : channelEnd
  const channelSource = xml.slice(channelStart, channelSourceEnd)
  for (const field of RSS_CHANNEL_FIELDS) {
    const element = childByName(channel, field)
    if (!nonEmptyText(element)) {
      errors.push(
        makeIssue(
          feedPath,
          element ? lineFor(xml, new RegExp(`<${field}\\b`), channelStart) : channelLine,
          `missing RSS field <${field}>`,
          repoRoot
        )
      )
    } else if (
      (field === 'link' || field === 'lastBuildDate') &&
      (field === 'link'
        ? !isValidHttpUrl(nonEmptyText(element))
        : !Number.isFinite(Date.parse(nonEmptyText(element))))
    ) {
      errors.push(
        makeIssue(
          feedPath,
          lineFor(xml, new RegExp(`<${field}\\b`), channelStart),
          `invalid RSS field <${field}>`,
          repoRoot
        )
      )
    }
  }

  const atomLink = Array.from(channel.children).find((element) => element.nodeName === 'atom:link')
  if (
    !atomLink ||
    atomLink.getAttribute('rel') !== 'self' ||
    !isValidHttpUrl(atomLink.getAttribute('href') ?? '')
  ) {
    errors.push(
      makeIssue(
        feedPath,
        atomLink ? lineFor(xml, /<atom:link\b/, channelStart) : channelLine,
        'missing or invalid RSS self link <atom:link>',
        repoRoot
      )
    )
  }

  const items = Array.from(channel.children).filter((element) => element.nodeName === 'item')
  const itemMatches = Array.from(channelSource.matchAll(/<item\b[\s\S]*?<\/item>/g))
  for (const [index, item] of items.entries()) {
    const itemStart = channelStart + (itemMatches[index]?.index ?? 0)
    const itemLine = lineFor(xml, /<item\b/, itemStart)
    for (const field of RSS_ITEM_FIELDS) {
      const element = childByName(item, field)
      if (!nonEmptyText(element)) {
        errors.push(
          makeIssue(feedPath, itemLine, `RSS item ${index + 1} is missing <${field}>`, repoRoot)
        )
      } else if ((field === 'link' || field === 'guid') && !isValidHttpUrl(nonEmptyText(element))) {
        errors.push(
          makeIssue(
            feedPath,
            lineFor(xml, new RegExp(`<${field}\\b`), itemStart),
            `RSS item ${index + 1} has an invalid <${field}>`,
            repoRoot
          )
        )
      } else if (field === 'pubDate' && !Number.isFinite(Date.parse(nonEmptyText(element)))) {
        errors.push(
          makeIssue(
            feedPath,
            lineFor(xml, /<pubDate\b/, itemStart),
            `RSS item ${index + 1} has an invalid <pubDate>`,
            repoRoot
          )
        )
      }
    }
  }
  return errors
}

function collectMdxFiles(contentRoot) {
  return collectFiles(contentRoot, (filePath) => extname(filePath).toLowerCase() === '.mdx')
}

function collectFeedFiles(outDir) {
  return collectFiles(outDir, (filePath) => filePath.split(sep).at(-1) === 'feed.xml')
}

function readSiteMetadata(metadataFile) {
  const source = readFileSync(metadataFile, 'utf8')
  if (extname(metadataFile).toLowerCase() === '.json') {
    return { metadata: JSON.parse(source), source }
  }
  return { metadata: siteMetadata, source }
}

function parseArguments(args) {
  const options = {
    mode: 'all',
    repoRoot: process.cwd(),
    contentRoot: 'data',
    outDir: 'out',
    metadataFile: 'data/siteMetadata.js',
    help: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index]
    if (option === '--help' || option === '-h') {
      options.help = true
      continue
    }
    if (
      !['--mode', '--repo-root', '--content-root', '--out-dir', '--metadata-file'].includes(option)
    ) {
      throw new Error(`Unknown option: ${option}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${option}`)
    index += 1
    options[option.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value
  }

  if (!['all', 'frontmatter', 'links', 'rss', 'built'].includes(options.mode)) {
    throw new Error(`Unknown validation mode: ${options.mode}`)
  }
  for (const key of ['contentRoot', 'outDir', 'metadataFile']) {
    if (!isAbsolute(options[key])) options[key] = resolve(options.repoRoot, options[key])
  }
  options.repoRoot = resolve(options.repoRoot)
  return options
}

export function validateRepository(options) {
  const errors = []
  const mode = options.mode ?? 'all'
  const contentRoot = resolve(options.contentRoot)
  const outDir = resolve(options.outDir)
  const repoRoot = resolve(options.repoRoot ?? process.cwd())
  const metadataFile = resolve(options.metadataFile ?? join(repoRoot, 'data/siteMetadata.js'))
  const mdxFiles = collectMdxFiles(contentRoot)
  const frontmatterEnabled = mode === 'all' || mode === 'frontmatter'
  const linksEnabled = mode === 'all' || mode === 'links' || mode === 'built'
  const rssEnabled = mode === 'all' || mode === 'rss' || mode === 'built'
  const loadedMetadata = linksEnabled || rssEnabled ? readSiteMetadata(metadataFile) : null
  const siteUrl = options.siteUrl ?? loadedMetadata?.metadata.siteUrl ?? siteMetadata.siteUrl

  if (frontmatterEnabled || linksEnabled) {
    for (const filePath of mdxFiles) {
      const source = readFileSync(filePath, 'utf8')
      if (frontmatterEnabled)
        errors.push(...validateFrontmatter(filePath, source, contentRoot, repoRoot))
      if (linksEnabled)
        errors.push(
          ...validateLocalLinks(filePath, source, { contentRoot, outDir, siteUrl, repoRoot })
        )
    }
  }

  if (linksEnabled && !existsSync(outDir)) {
    errors.push(
      makeIssue(outDir, 1, 'static export directory not found; run `yarn build` first', repoRoot)
    )
  }

  if (rssEnabled) {
    const { metadata, source } = loadedMetadata
    errors.push(...validateSiteMetadata(metadata, metadataFile, source, repoRoot))
    const feeds = collectFeedFiles(outDir)
    if (feeds.length === 0) {
      errors.push(
        makeIssue(
          join(outDir, 'feed.xml'),
          1,
          'generated RSS feed not found; run `yarn build` first',
          repoRoot
        )
      )
    }
    for (const feedPath of feeds) {
      errors.push(...validateRssFeed(feedPath, readFileSync(feedPath, 'utf8'), repoRoot))
    }
  }
  return errors
}

export function run(args) {
  try {
    const options = parseArguments(args)
    if (options.help) return { exitCode: 0, stdout: `${usage()}\n`, stderr: '' }
    const errors = validateRepository(options)
    if (errors.length > 0) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `${errors.map(({ file, line, message }) => `${file}:${line}: ${message}`).join('\n')}\n`,
      }
    }
    return {
      exitCode: 0,
      stdout: `Content and RSS validation passed (${options.mode}).\n`,
      stderr: '',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { exitCode: 2, stdout: '', stderr: `${message}\n${usage()}\n` }
  }
}

function usage() {
  return `Usage: node scripts/validate-content.mjs [--mode all|frontmatter|links|rss|built] [--repo-root <path>] [--content-root <path>] [--out-dir <path>] [--metadata-file <path>]`
}

function main() {
  const result = run(process.argv.slice(2))
  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  if (result.exitCode !== 0) process.exitCode = result.exitCode
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
