import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_THRESHOLD = 80
const RUNTIME_ROOTS = /^(?:app|components|data|layouts|lib|scripts)\//
const RUNTIME_EXTENSIONS = /\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$/
const TEST_OR_GENERATED =
  /(?:^|\/)(?:__tests__|testing|generated|\.contentlayer)(?:\/|$)|\.(?:test|spec|d)\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$/

function normalizeRelativePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '')
}

export function isRuntimeSourcePath(filePath) {
  const normalized = normalizeRelativePath(filePath)
  return (
    RUNTIME_ROOTS.test(normalized) &&
    RUNTIME_EXTENSIONS.test(normalized) &&
    !TEST_OR_GENERATED.test(normalized)
  )
}

export function parseUnifiedDiff(diffText) {
  const changedLines = new Map()
  let filePath = null
  let newLineNumber = null

  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith('+++ ')) {
      const headerPath = line.slice(4).split('\t', 1)[0]
      filePath =
        headerPath === '/dev/null' ? null : normalizeRelativePath(headerPath.replace(/^b\//, ''))
      continue
    }

    if (line.startsWith('@@')) {
      const hunk = line.match(/\+(\d+)(?:,\d+)?/)
      newLineNumber = hunk ? Number(hunk[1]) : null
      continue
    }

    if (newLineNumber === null) continue

    if (line.startsWith('+') && !line.startsWith('+++')) {
      if (filePath && isRuntimeSourcePath(filePath)) {
        if (!changedLines.has(filePath)) changedLines.set(filePath, new Set())
        changedLines.get(filePath).add(newLineNumber)
      }
      newLineNumber += 1
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      continue
    } else if (line.startsWith(' ')) {
      newLineNumber += 1
    }
  }

  return changedLines
}

export function parseLcov(lcovText, root = process.cwd()) {
  const coverage = new Map()
  let currentFile = null

  for (const line of lcovText.split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      const sourcePath = line.slice(3)
      currentFile = isAbsolute(sourcePath) ? resolve(sourcePath) : resolve(root, sourcePath)
      if (!coverage.has(currentFile)) coverage.set(currentFile, new Map())
    } else if (line.startsWith('DA:') && currentFile) {
      const [lineNumberText, hitCountText] = line.slice(3).split(',', 2)
      const lineNumber = Number(lineNumberText)
      const hitCount = Number(hitCountText)
      if (Number.isInteger(lineNumber) && Number.isFinite(hitCount)) {
        coverage.get(currentFile).set(lineNumber, hitCount)
      }
    } else if (line === 'end_of_record') {
      currentFile = null
    }
  }

  return coverage
}

export function calculateDiffCoverage(changedLines, coverageByFile, root = process.cwd()) {
  let covered = 0
  let total = 0

  for (const [relativePath, lineNumbers] of changedLines) {
    const fileCoverage = coverageByFile.get(resolve(root, relativePath))
    if (!fileCoverage) {
      total += lineNumbers.size
      continue
    }

    for (const lineNumber of lineNumbers) {
      const hits = fileCoverage.get(lineNumber)
      if (hits === undefined) continue
      total += 1
      if (hits > 0) covered += 1
    }
  }

  return { covered, total, percentage: total === 0 ? 100 : (covered / total) * 100 }
}

export function usage() {
  return (
    `Usage: node scripts/check-diff-coverage.mjs --base <git-ref> [--lcov-file <path>] [--threshold <0-100>]\n` +
    `       node scripts/check-diff-coverage.mjs --diff-file <path> --lcov-file <path> --root <path> [--threshold <0-100>]\n` +
    `Checks changed runtime source lines in app/, components/, data/, layouts/, lib/, and scripts/.`
  )
}

export function parseArguments(args) {
  const options = { threshold: DEFAULT_THRESHOLD, root: process.cwd(), help: false }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }
    if (!['--base', '--diff-file', '--lcov-file', '--root', '--threshold'].includes(argument)) {
      throw new Error(`Unknown option: ${argument}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`)
    index += 1
    const key = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    options[key] = key === 'threshold' ? Number(value) : value
  }

  if (!Number.isFinite(options.threshold) || options.threshold < 0 || options.threshold > 100) {
    throw new Error('--threshold must be a number between 0 and 100')
  }
  if (!options.help && !options.base && !options.diffFile) {
    throw new Error('Provide either --base or --diff-file')
  }

  return options
}

export function loadDiff(options) {
  if (options.diffFile) return readFileSync(resolve(options.root, options.diffFile), 'utf8')
  return execFileSync(
    'git',
    ['diff', '--no-ext-diff', '--unified=0', '--diff-filter=AMR', `${options.base}...HEAD`, '--'],
    { cwd: options.root, encoding: 'utf8' }
  )
}

export function run(args) {
  try {
    const options = parseArguments(args)
    if (options.help) {
      return { exitCode: 0, stdout: `${usage()}\n`, stderr: '' }
    }

    const diffText = loadDiff(options)
    const lcovPath = resolve(options.root, options.lcovFile ?? 'coverage/lcov.info')
    const lcovText = readFileSync(lcovPath, 'utf8')
    const changedLines = parseUnifiedDiff(diffText)
    const summary = calculateDiffCoverage(
      changedLines,
      parseLcov(lcovText, options.root),
      options.root
    )

    if (summary.total === 0) {
      return {
        exitCode: 0,
        stdout: 'No changed runtime lines to measure; diff coverage passed.\n',
        stderr: '',
      }
    }

    const stdout =
      `Diff coverage: ${summary.percentage.toFixed(1)}% (${summary.covered}/${summary.total} executable changed lines); ` +
      `threshold ${options.threshold}%\n`
    return {
      exitCode: summary.percentage < options.threshold ? 1 : 0,
      stdout,
      stderr: '',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { exitCode: 2, stdout: '', stderr: `${message}\n${usage()}\n` }
  }
}

function main() {
  const result = run(process.argv.slice(2))
  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  if (result.exitCode !== 0) process.exitCode = result.exitCode
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
