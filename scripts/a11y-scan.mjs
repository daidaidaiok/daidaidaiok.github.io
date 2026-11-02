import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AxeBuilder } from '@axe-core/playwright'
import { chromium } from 'playwright'

const CORE_ROUTES = ['/', '/blog/', '/tags/']
const EXTRA_ROUTES = ['/about/', '/projects/']
const BLOCKING_IMPACTS = ['critical', 'serious']
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
}

export function getA11yRoutes(tagData) {
  const tags = Object.keys(tagData ?? {})
  if (tags.length === 0) throw new Error('No generated tag route is available for the a11y scan')
  const tag = tags.find((value) => /^[a-z0-9-]+$/i.test(value)) ?? tags[0]
  return [...CORE_ROUTES, `/tags/${encodeURIComponent(tag)}/`, ...EXTRA_ROUTES]
}

export function resolveStaticPath(requestPath, outDir) {
  let pathname
  try {
    pathname = new URL(requestPath, 'http://127.0.0.1').pathname
  } catch {
    return null
  }

  let decodedPathname
  try {
    decodedPathname = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const root = resolve(outDir)
  const pathnames = [...new Set([pathname, decodedPathname])]
  let fallback = null
  for (const candidatePath of pathnames) {
    const target = resolve(root, ...candidatePath.split('/').filter(Boolean))
    const relativeTarget = relative(root, target)
    if (
      relativeTarget === '..' ||
      relativeTarget.startsWith(`..${sep}`) ||
      isAbsolute(relativeTarget)
    ) {
      continue
    }
    const filePath = extname(target) ? target : join(target, 'index.html')
    fallback ??= filePath
    if (existsSync(filePath) && statSync(filePath).isFile()) return filePath
  }
  return fallback
}

export function summarizeViolations(violations) {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 }
  for (const violation of violations) {
    const impact = Object.hasOwn(counts, violation.impact) ? violation.impact : 'unknown'
    counts[impact] += 1
  }
  const blocking = violations.filter((violation) => BLOCKING_IMPACTS.includes(violation.impact))
  return { blocking, counts, failed: blocking.length > 0 }
}

function createStaticServer(outDir) {
  const server = createServer((request, response) => {
    const filePath = resolveStaticPath(request.url ?? '/', outDir)
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not Found')
      return
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    })
    createReadStream(filePath).pipe(response)
  })

  return new Promise((resolveServer, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to determine static preview server address'))
        return
      }
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}` })
    })
  })
}

function closeServer(server) {
  return new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()))
  })
}

async function scanStaticExport(outDir, repoRoot) {
  const tagsFile = resolve(repoRoot, 'app/tag-data.json')
  const tagData = JSON.parse(readFileSync(tagsFile, 'utf8'))
  const routes = getA11yRoutes(tagData)
  const { server, baseUrl } = await createStaticServer(outDir)
  let browser
  const routeResults = []
  const errors = []

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    for (const route of routes) {
      const page = await context.newPage()
      try {
        const response = await page.goto(new URL(route, baseUrl).href, {
          waitUntil: 'networkidle',
          timeout: 45_000,
        })
        if (!response || response.status() >= 400) {
          throw new Error(`HTTP ${response?.status() ?? 'no response'}`)
        }
        const results = await new AxeBuilder({ page }).analyze()
        routeResults.push({ route, violations: results.violations })
      } catch (error) {
        errors.push({
          route,
          message: error instanceof Error ? error.message : String(error),
        })
      } finally {
        await page.close()
      }
    }
    await context.close()
  } finally {
    if (browser) await browser.close()
    await closeServer(server)
  }

  const violations = routeResults.flatMap(({ route, violations: routeViolations }) =>
    routeViolations.map((violation) => ({ ...violation, route }))
  )
  const summary = summarizeViolations(violations)
  return {
    generatedAt: new Date().toISOString(),
    routes,
    results: routeResults,
    errors,
    summary: { ...summary, total: violations.length },
  }
}

function parseArguments(args) {
  const options = {
    outDir: 'out',
    reportPath: 'artifacts/a11y/report.json',
    repoRoot: process.cwd(),
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!['--out-dir', '--report-path', '--repo-root'].includes(argument)) {
      throw new Error(`Unknown option: ${argument}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`)
    index += 1
    options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value
  }
  options.repoRoot = resolve(options.repoRoot)
  options.outDir = resolve(options.repoRoot, options.outDir)
  options.reportPath = resolve(options.repoRoot, options.reportPath)
  if (!existsSync(options.outDir))
    throw new Error(`Static export directory not found: ${options.outDir}`)
  return options
}

export async function run(args) {
  try {
    const options = parseArguments(args)
    const report = await scanStaticExport(options.outDir, options.repoRoot)
    mkdirSync(dirname(options.reportPath), { recursive: true })
    writeFileSync(options.reportPath, `${JSON.stringify(report, null, 2)}\n`)

    const { summary } = report
    const output =
      `Accessibility scan: ${report.routes.length} routes, ${summary.total} violations; ` +
      `${summary.blocking.length} serious/critical, ${summary.counts.moderate} moderate, ${summary.counts.minor} minor.`
    const errorOutput = report.errors
      .map(({ route, message }) => `${route}: scan error: ${message}`)
      .join('\n')
    if (summary.failed || report.errors.length > 0) {
      return {
        exitCode: 1,
        stdout: `${output}\n`,
        stderr: `${errorOutput || summary.blocking.map(({ route, id }) => `${route}: ${id}`).join('\n')}\n`,
      }
    }
    return { exitCode: 0, stdout: `${output}\n`, stderr: '' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { exitCode: 2, stdout: '', stderr: `${message}\n` }
  }
}

function main() {
  run(process.argv.slice(2)).then((result) => {
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
    if (result.exitCode !== 0) process.exitCode = result.exitCode
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
