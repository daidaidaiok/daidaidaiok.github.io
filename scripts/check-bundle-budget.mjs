import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_BUDGET_FILE = 'scripts/bundle-budget.json'
const DEFAULT_REPORT_FILE = 'artifacts/bundle-budget/report.json'
const SCRIPT_SOURCE = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi
const GLOB_CHARACTERS = ['*', '?', '[', ']', '{', '}']

function walkHtmlFiles(directory) {
  if (!existsSync(directory)) return []
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walkHtmlFiles(entryPath))
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') files.push(entryPath)
  }
  return files
}

function safePath(root, relativePath) {
  const absolutePath = resolve(root, relativePath)
  const relativeTarget = relative(root, absolutePath)
  if (
    relativeTarget === '..' ||
    relativeTarget.startsWith(`..${sep}`) ||
    isAbsolute(relativeTarget)
  ) {
    return null
  }
  return absolutePath
}

function routeForHtml(outDir, htmlPath) {
  const relativePath = relative(outDir, htmlPath)
  const directory = dirname(relativePath)
  return directory === '.' ? '/' : `/${directory.split(sep).join('/')}/`
}

function resolveBundleAsset(source, outDir) {
  let pathname
  try {
    pathname = new URL(source, 'https://bundle-budget.local').pathname
  } catch {
    return null
  }
  if (!pathname.startsWith('/_next/static/') || !pathname.toLowerCase().endsWith('.js')) return null

  let decodedPathname
  try {
    decodedPathname = decodeURIComponent(pathname)
  } catch {
    decodedPathname = pathname
  }

  for (const candidate of new Set([pathname, decodedPathname])) {
    const filePath = safePath(outDir, candidate.slice(1))
    if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
      return { path: candidate.slice(1), filePath }
    }
  }
  throw new Error(`Unable to resolve initial JavaScript asset ${source} under ${outDir}`)
}

export function collectBundleMetrics(outDir) {
  const root = resolve(outDir)
  if (!existsSync(root)) throw new Error(`Static export directory not found: ${root}`)

  const sizeCache = new Map()
  const routes = {}
  const assetSets = []
  for (const htmlPath of walkHtmlFiles(root)) {
    const route = routeForHtml(root, htmlPath)
    const html = readFileSync(htmlPath, 'utf8')
    const assetPaths = new Set()
    for (const match of html.matchAll(SCRIPT_SOURCE)) {
      const asset = resolveBundleAsset(match[2], root)
      if (!asset) continue
      assetPaths.add(asset.path)
      if (!sizeCache.has(asset.path)) {
        sizeCache.set(asset.path, gzipSync(readFileSync(asset.filePath)).byteLength)
      }
    }

    const assets = [...assetPaths].sort()
    const bytes = assets.reduce((total, assetPath) => total + sizeCache.get(assetPath), 0)
    routes[route] = { assets, bytes }
    assetSets.push(assetPaths)
  }

  if (assetSets.length === 0) throw new Error(`No static HTML routes found under ${root}`)
  const javascriptRouteAssets = assetSets.filter((assets) => assets.size > 0)
  const sharedAssets = [...(javascriptRouteAssets[0] ?? [])]
    .filter((asset) => javascriptRouteAssets.every((assets) => assets.has(asset)))
    .sort()
  return {
    routes,
    shared: {
      assets: sharedAssets,
      bytes: sharedAssets.reduce((total, assetPath) => total + sizeCache.get(assetPath), 0),
    },
  }
}

function validateRouteExceptions(routeExceptions, maxGrowthPercent) {
  if (!Array.isArray(routeExceptions)) throw new Error('routeExceptions must be an array')
  const seenRoutes = new Set()
  for (const [index, exception] of routeExceptions.entries()) {
    const route = exception?.route
    if (
      typeof route !== 'string' ||
      !route.startsWith('/') ||
      GLOB_CHARACTERS.some((character) => route.includes(character)) ||
      route.split('/').includes('..')
    ) {
      throw new Error(`route exception ${index + 1} must use an exact route path`)
    }
    if (seenRoutes.has(route)) throw new Error(`duplicate route exception: ${route}`)
    seenRoutes.add(route)
    if (
      typeof exception.reason !== 'string' ||
      !exception.reason.trim() ||
      !Number.isFinite(exception.maxGrowthPercent) ||
      exception.maxGrowthPercent < maxGrowthPercent
    ) {
      throw new Error(
        `route exception ${route} needs a reason and maxGrowthPercent >= ${maxGrowthPercent}`
      )
    }
  }
}

function compareSize(target, baseBytes, currentBytes, thresholdPercent, exception) {
  const deltaBytes = currentBytes - baseBytes
  const deltaPercent =
    baseBytes === 0 ? (currentBytes === 0 ? 0 : null) : (deltaBytes / baseBytes) * 100
  const limit = exception?.maxGrowthPercent ?? thresholdPercent
  return {
    target,
    baseBytes,
    currentBytes,
    deltaBytes,
    deltaPercent,
    thresholdPercent: limit,
    exception: exception?.reason,
    passed: deltaPercent !== null && deltaPercent <= limit,
  }
}

export function compareBundleMetrics(baseMetrics, currentMetrics, config = {}) {
  const maxGrowthPercent = config.maxGrowthPercent ?? 10
  const routeExceptions = config.routeExceptions ?? []
  if (!Number.isFinite(maxGrowthPercent) || maxGrowthPercent < 0 || maxGrowthPercent > 1000) {
    throw new Error('maxGrowthPercent must be between 0 and 1000')
  }
  validateRouteExceptions(routeExceptions, maxGrowthPercent)
  const exceptions = new Map(routeExceptions.map((exception) => [exception.route, exception]))

  const shared = compareSize(
    'shared client JS',
    baseMetrics.shared.bytes,
    currentMetrics.shared.bytes,
    maxGrowthPercent
  )
  const routes = []
  for (const route of [
    ...new Set([...Object.keys(baseMetrics.routes), ...Object.keys(currentMetrics.routes)]),
  ].sort()) {
    const base = baseMetrics.routes[route]
    const current = currentMetrics.routes[route]
    if (!base) {
      routes.push({
        route,
        baseBytes: null,
        currentBytes: current.bytes,
        status: 'new',
        passed: true,
      })
    } else if (!current) {
      routes.push({
        route,
        baseBytes: base.bytes,
        currentBytes: null,
        status: 'removed',
        passed: true,
      })
    } else {
      routes.push({
        ...compareSize(route, base.bytes, current.bytes, maxGrowthPercent, exceptions.get(route)),
        route,
        status: 'compared',
      })
    }
  }
  const failures = [shared, ...routes].filter((comparison) => !comparison.passed)
  return { maxGrowthPercent, shared, routes, failures, passed: failures.length === 0 }
}

function readBudgetConfig(configFile) {
  const source = readFileSync(configFile, 'utf8')
  let config
  try {
    config = JSON.parse(source)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${configFile}: invalid JSON: ${message}`)
  }
  if (!config || !Number.isFinite(config.maxGrowthPercent)) {
    throw new Error(`${configFile}: maxGrowthPercent must be a number`)
  }
  validateRouteExceptions(config.routeExceptions ?? [], config.maxGrowthPercent)
  return config
}

function parseArguments(args) {
  const options = {
    configFile: DEFAULT_BUDGET_FILE,
    reportPath: DEFAULT_REPORT_FILE,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!['--base-dir', '--current-dir', '--config-file', '--report-path'].includes(argument)) {
      throw new Error(`Unknown option: ${argument}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`)
    index += 1
    options[argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value
  }
  if (!options.baseDir || !options.currentDir) {
    throw new Error('Provide --base-dir <path> and --current-dir <path>')
  }
  options.baseDir = resolve(options.baseDir)
  options.currentDir = resolve(options.currentDir)
  options.configFile = resolve(options.configFile)
  options.reportPath = resolve(options.reportPath)
  return options
}

function formatDelta(deltaPercent) {
  if (deltaPercent === null) return '+∞%'
  if (!Number.isFinite(deltaPercent)) return deltaPercent > 0 ? '+∞%' : '0.0%'
  return `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`
}

export function run(args) {
  try {
    const options = parseArguments(args)
    const config = readBudgetConfig(options.configFile)
    const baseMetrics = collectBundleMetrics(options.baseDir)
    const currentMetrics = collectBundleMetrics(options.currentDir)
    const report = {
      generatedAt: new Date().toISOString(),
      compression: 'gzip',
      ...compareBundleMetrics(baseMetrics, currentMetrics, config),
    }
    mkdirSync(dirname(options.reportPath), { recursive: true })
    writeFileSync(options.reportPath, `${JSON.stringify(report, null, 2)}\n`)

    const lines = [
      `Shared client JS (gzip): ${report.shared.baseBytes} -> ${report.shared.currentBytes} bytes (${formatDelta(report.shared.deltaPercent)}; limit ${report.shared.thresholdPercent}%) ${report.shared.passed ? 'PASS' : 'FAIL'}`,
      ...report.routes.map((route) => {
        if (route.status !== 'compared') {
          return `${route.route}: ${route.status} route (${route.currentBytes ?? route.baseBytes} bytes)`
        }
        return `${route.route} (gzip): ${route.baseBytes} -> ${route.currentBytes} bytes (${formatDelta(route.deltaPercent)}; limit ${route.thresholdPercent}%) ${route.passed ? 'PASS' : 'FAIL'}`
      }),
      `Report: ${options.reportPath}`,
    ]
    return {
      exitCode: report.passed ? 0 : 1,
      stdout: `${lines.join('\n')}\n`,
      stderr: report.passed
        ? ''
        : `Bundle size budget exceeded for: ${report.failures.map(({ target }) => target).join(', ')}\n`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { exitCode: 2, stdout: '', stderr: `${message}\n${usage()}\n` }
  }
}

export function usage() {
  return 'Usage: node scripts/check-bundle-budget.mjs --base-dir <path> --current-dir <path> [--config-file <path>] [--report-path <path>]'
}

function main() {
  const result = run(process.argv.slice(2))
  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  if (result.exitCode !== 0) process.exitCode = result.exitCode
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
