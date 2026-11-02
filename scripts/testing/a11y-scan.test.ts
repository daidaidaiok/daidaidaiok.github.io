import { get as httpGet } from 'node:http'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ launch: vi.fn(), analyze: vi.fn() }))

vi.mock('playwright', () => ({ chromium: { launch: mocks.launch } }))
vi.mock('@axe-core/playwright', () => ({
  AxeBuilder: class {
    analyze() {
      return mocks.analyze()
    }
  },
}))

import { getA11yRoutes, resolveStaticPath, run, summarizeViolations } from '../a11y-scan.mjs'

const tagData = JSON.parse(
  readFileSync(resolve(process.cwd(), 'app/tag-data.json'), 'utf8')
) as Record<string, unknown>
const temporaryDirectories: string[] = []

function createFixture(missingRoutes: string[] = []) {
  const root = mkdtempSync(resolve(tmpdir(), 'hpb-a11y-scan-'))
  temporaryDirectories.push(root)
  const outDir = resolve(root, 'out')
  const tagsFile = resolve(root, 'app/tag-data.json')
  mkdirSync(dirname(tagsFile), { recursive: true })
  writeFileSync(tagsFile, JSON.stringify({ claudecode: [] }))

  for (const route of getA11yRoutes({ claudecode: [] })) {
    if (missingRoutes.includes(route)) continue
    const filePath = resolveStaticPath(route, outDir)
    if (!filePath) throw new Error(`Invalid fixture route: ${route}`)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(
      filePath,
      '<!doctype html><html lang="en"><body><main>Fixture</main></body></html>'
    )
  }
  return { root, outDir }
}

function createBrowserMock() {
  const pages: unknown[] = []
  const context = {
    newPage: vi.fn(() => {
      const page = {
        goto: vi.fn(
          (url: string) =>
            new Promise<{ status: () => number }>((resolveResponse, rejectResponse) => {
              httpGet(url, (response) => {
                response.resume()
                resolveResponse({ status: () => response.statusCode ?? 0 })
              }).on('error', rejectResponse)
            })
        ),
        close: vi.fn(),
      }
      pages.push(page)
      return page
    }),
    close: vi.fn(),
  }
  const browser = { newContext: vi.fn(async () => context), close: vi.fn() }
  mocks.launch.mockResolvedValue(browser)
  return { browser, context, pages }
}

function runFixture(fixture: ReturnType<typeof createFixture>) {
  return run([
    '--repo-root',
    fixture.root,
    '--out-dir',
    'out',
    '--report-path',
    'reports/a11y.json',
  ])
}

afterEach(() => {
  vi.clearAllMocks()
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('static export accessibility scan policy', () => {
  it('covers the home, content indexes, about, projects, and a real generated tag route', () => {
    const routes = getA11yRoutes(tagData)
    const expectedTag =
      Object.keys(tagData).find((value) => /^[a-z0-9-]+$/i.test(value)) ?? Object.keys(tagData)[0]

    expect(routes).toEqual([
      '/',
      '/blog/',
      '/tags/',
      `/tags/${encodeURIComponent(expectedTag)}/`,
      '/about/',
      '/projects/',
    ])
  })

  it('resolves exported route indexes and blocks paths outside the export directory', () => {
    const outDir = resolve(process.cwd(), 'out')

    expect(resolveStaticPath('/about/', outDir)).toBe(resolve(outDir, 'about/index.html'))
    expect(resolveStaticPath('/tags/claudecode/', outDir)).toBe(
      resolve(outDir, 'tags/claudecode/index.html')
    )
    expect(resolveStaticPath('/../../etc/passwd', outDir)).toBe(
      resolve(outDir, 'etc/passwd/index.html')
    )
  })

  it('resolves percent-encoded route segments to their exported file names', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'hpb-a11y-path-'))
    temporaryDirectories.push(root)
    const outDir = resolve(root, 'out')
    const expected = resolve(outDir, '_next/static/chunks/[route]/page.js')
    mkdirSync(dirname(expected), { recursive: true })
    writeFileSync(expected, 'export default 1')

    expect(resolveStaticPath('/_next/static/chunks/%5Broute%5D/page.js', outDir)).toBe(expected)
  })

  it('blocks serious and critical findings while preserving lower-impact counts', () => {
    const summary = summarizeViolations([
      { id: 'contrast', impact: 'serious' },
      { id: 'label', impact: 'critical' },
      { id: 'landmark', impact: 'moderate' },
      { id: 'title', impact: 'minor' },
      { id: 'custom', impact: null },
    ])

    expect(summary.blocking.map(({ id }) => id)).toEqual(['contrast', 'label'])
    expect(summary.counts).toEqual({ critical: 1, serious: 1, moderate: 1, minor: 1, unknown: 1 })
    expect(summary.failed).toBe(true)
  })

  it('scans every core route, writes a report, and closes browser resources', async () => {
    const fixture = createFixture()
    const { browser, context, pages } = createBrowserMock()
    mocks.analyze.mockResolvedValue({ violations: [] })

    const result = await runFixture(fixture)
    const report = JSON.parse(readFileSync(resolve(fixture.root, 'reports/a11y.json'), 'utf8'))

    expect(result.exitCode).toBe(0)
    expect(report.routes).toHaveLength(6)
    expect(report.results).toHaveLength(6)
    expect(pages).toHaveLength(6)
    expect(context.close).toHaveBeenCalledOnce()
    expect(browser.close).toHaveBeenCalledOnce()
  })

  it('returns a blocking status and report for serious findings and route failures', async () => {
    const fixture = createFixture(['/projects/'])
    createBrowserMock()
    mocks.analyze.mockResolvedValue({
      violations: [{ id: 'contrast', impact: 'serious', nodes: [] }],
    })

    const result = await runFixture(fixture)
    const report = JSON.parse(readFileSync(resolve(fixture.root, 'reports/a11y.json'), 'utf8'))

    expect(result.exitCode).toBe(1)
    expect(report.summary.blocking).toHaveLength(5)
    expect(report.errors).toEqual([{ route: '/projects/', message: 'HTTP 404' }])
  })

  it('reports invalid command line options', async () => {
    expect(await run(['--unknown'])).toEqual(
      expect.objectContaining({ exitCode: 2, stderr: expect.stringContaining('Unknown option') })
    )
  })
})
