import { gzipSync } from 'node:zlib'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { collectBundleMetrics, compareBundleMetrics, run } from '../check-bundle-budget.mjs'

const temporaryDirectories: string[] = []

function createBuild(name: string, routes: Record<string, string[]>) {
  const root = mkdtempSync(join(tmpdir(), 'hpb-bundle-budget-'))
  temporaryDirectories.push(root)
  const outDir = join(root, name)
  const chunks = join(outDir, '_next/static/chunks')
  mkdirSync(chunks, { recursive: true })

  for (const [route, scripts] of Object.entries(routes)) {
    const htmlPath =
      route === '/' ? join(outDir, 'index.html') : join(outDir, route.slice(1), 'index.html')
    mkdirSync(dirname(htmlPath), { recursive: true })
    writeFileSync(
      htmlPath,
      `<html><body>${scripts.map((script) => `<script src="/_next/static/chunks/${script}"></script>`).join('')}</body></html>`
    )
  }
  return { root, outDir, chunks }
}

function writeChunk(build: ReturnType<typeof createBuild>, fileName: string, content: string) {
  writeFileSync(join(build.chunks, fileName), content)
}

function metrics(sharedBytes: number, routes: Record<string, number>) {
  return {
    shared: { bytes: sharedBytes, assets: ['shared.js'] },
    routes: Object.fromEntries(
      Object.entries(routes).map(([route, bytes]) => [route, { bytes, assets: [] }])
    ),
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('compressed bundle budget', () => {
  it('configures a Node 24 PR check that builds the exact base revision and uploads a report', () => {
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/bundle-budget.yml'),
      'utf8'
    )
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'scripts/bundle-budget.json'), 'utf8')
    ) as { maxGrowthPercent: number; routeExceptions: unknown[] }

    expect(workflow).toContain('branches: [staging, main]')
    expect(workflow).toContain('node-version: 24')
    expect(workflow).toContain('BASE_SHA: ${{ github.event.pull_request.base.sha }}')
    expect(workflow).toContain('git worktree add')
    expect(workflow).toContain('yarn check:bundle-budget')
    expect(workflow).toMatch(/actions\/upload-artifact@v\d+/)
    // Next 16's framework runtime sets this one-time migration baseline; follow-up batches re-evaluate 10%.
    expect(config).toEqual({ maxGrowthPercent: 22, routeExceptions: [] })
  })

  it('collects gzip sizes for route scripts and their shared intersection', () => {
    const build = createBuild('out', {
      '/': ['shared.js', 'home.js'],
      '/about/': ['shared.js', 'about.js'],
      '/plain/': [],
    })
    const shared = 'window.shared = true;'
    const home = 'window.home = true;'
    const about = 'window.about = true;'
    writeChunk(build, 'shared.js', shared)
    writeChunk(build, 'home.js', home)
    writeChunk(build, 'about.js', about)

    const result = collectBundleMetrics(build.outDir)

    expect(result.routes['/'].bytes).toBe(
      gzipSync(Buffer.from(shared)).length + gzipSync(Buffer.from(home)).length
    )
    expect(result.shared.assets).toEqual(['_next/static/chunks/shared.js'])
    expect(result.shared.bytes).toBe(gzipSync(Buffer.from(shared)).length)
  })

  it('keeps standalone HTML files separate from the root index route', () => {
    const build = createBuild('out', { '/': ['home.js'] })
    writeChunk(build, 'home.js', 'window.home = true;')
    writeFileSync(
      join(build.outDir, '404.html'),
      '<html><script src="/_next/static/chunks/not-found.js"></script></html>'
    )
    writeChunk(build, 'not-found.js', 'window.notFound = true;')

    const result = collectBundleMetrics(build.outDir)

    expect(result.routes['/']).toBeDefined()
    expect(result.routes['/404.html']).toBeDefined()
    expect(result.routes['/404.html'].bytes).toBeGreaterThan(0)
  })

  it('normalizes a configured base path before resolving Next static scripts', () => {
    const build = createBuild('out', { '/': ['shared.js'] })
    const content = 'window.shared = true;'
    writeChunk(build, 'shared.js', content)
    writeFileSync(
      join(build.outDir, 'index.html'),
      '<html><script src="/myblog/_next/static/chunks/shared.js"></script></html>'
    )

    const result = collectBundleMetrics(build.outDir)

    expect(result.routes['/'].bytes).toBe(gzipSync(Buffer.from(content)).length)
    expect(result.shared.bytes).toBe(gzipSync(Buffer.from(content)).length)
  })

  it('passes exactly ten percent growth and fails growth above ten percent', () => {
    const baseline = metrics(100, { '/': 100, '/about/': 100 })
    const boundary = compareBundleMetrics(baseline, metrics(110, { '/': 110, '/about/': 110 }))
    const over = compareBundleMetrics(baseline, metrics(111, { '/': 110, '/about/': 111 }))

    expect(boundary.passed).toBe(true)
    expect(over.passed).toBe(false)
    expect(
      over.failures.map((failure) => ('route' in failure ? failure.route : failure.target))
    ).toEqual(['shared client JS', '/about/'])
  })

  it('fails growth from a zero-byte baseline without serializing infinity', () => {
    const result = compareBundleMetrics(metrics(0, { '/': 0 }), metrics(1, { '/': 1 }))

    expect(result.passed).toBe(false)
    expect(result.shared.deltaPercent).toBeNull()
    expect(JSON.stringify(result)).not.toContain('Infinity')
  })

  it('applies exact route exceptions and reports new routes without a false baseline', () => {
    const baseline = metrics(100, { '/': 100, '/about/': 100 })
    const result = compareBundleMetrics(
      baseline,
      metrics(100, { '/': 100, '/about/': 115, '/new/': 300 }),
      {
        maxGrowthPercent: 10,
        routeExceptions: [
          { route: '/about/', maxGrowthPercent: 20, reason: 'Existing embedded media' },
        ],
      }
    )

    expect(result.passed).toBe(true)
    expect(result.routes.find((entry) => entry.route === '/about/')).toEqual(
      expect.objectContaining({ exception: 'Existing embedded media', passed: true })
    )
    expect(result.routes.find((entry) => entry.route === '/new/')).toEqual(
      expect.objectContaining({ status: 'new', passed: true })
    )
  })

  it('writes a machine-readable report and nonzero status for an over-budget build', async () => {
    const baseline = createBuild('baseline', { '/': ['shared.js', 'home.js'] })
    const current = createBuild('current', { '/': ['shared.js', 'home.js'] })
    writeChunk(baseline, 'shared.js', 'shared')
    writeChunk(baseline, 'home.js', 'x'.repeat(500))
    writeChunk(current, 'shared.js', 'shared')
    writeChunk(current, 'home.js', 'x'.repeat(2_000))
    const config = join(current.root, 'bundle-budget.json')
    const reportPath = join(current.root, 'report.json')
    writeFileSync(config, JSON.stringify({ maxGrowthPercent: 10, routeExceptions: [] }))

    const result = await run([
      '--base-dir',
      baseline.outDir,
      '--current-dir',
      current.outDir,
      '--config-file',
      config,
      '--report-path',
      reportPath,
    ])
    const report = JSON.parse(readFileSync(reportPath, 'utf8'))

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('gzip')
    expect(report.failures.length).toBeGreaterThan(0)
  })
})
