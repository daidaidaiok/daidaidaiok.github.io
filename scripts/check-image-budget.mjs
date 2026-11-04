import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_BUDGET_BYTES = 500_000
const DEFAULT_EXCEPTIONS_FILE = 'scripts/image-budget-exceptions.json'
const IMAGE_EXTENSION = /\.(?:png|jpe?g)$/i
const GLOB_CHARACTERS = ['*', '?', '[', ']', '{', '}']

function repositoryPath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '')
}

function validateExceptionPath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error('Image exception must include an exact path')
  }
  const normalized = repositoryPath(filePath)
  if (
    GLOB_CHARACTERS.some((character) => normalized.includes(character)) ||
    normalized.startsWith('/') ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.split('/').includes('..')
  ) {
    throw new Error(`Image exception path must be an exact repository-relative path: ${filePath}`)
  }
  if (!IMAGE_EXTENSION.test(normalized)) {
    throw new Error(`Image exception path must target PNG/JPG/JPEG: ${filePath}`)
  }
  return normalized
}

function readExceptions(root, exceptionsFile) {
  const filePath = resolve(root, exceptionsFile)
  const relativePath = relative(root, filePath)
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error('Exceptions file must be inside the repository')
  }
  if (!existsSync(filePath))
    throw new Error(`Image exceptions file not found: ${repositoryPath(exceptionsFile)}`)

  const source = readFileSync(filePath, 'utf8')
  let config
  try {
    config = JSON.parse(source)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${repositoryPath(exceptionsFile)}:1: invalid JSON: ${message}`, {
      cause: error,
    })
  }
  if (!config || !Array.isArray(config.exceptions)) {
    throw new Error(`${repositoryPath(exceptionsFile)}:1: expected an "exceptions" array`)
  }

  const exceptions = new Map()
  for (const [index, exception] of config.exceptions.entries()) {
    const path = validateExceptionPath(exception?.path)
    if (typeof exception.reason !== 'string' || !exception.reason.trim()) {
      throw new Error(
        `${repositoryPath(exceptionsFile)}: exception ${index + 1} must include a reason`
      )
    }
    if (exceptions.has(path))
      throw new Error(`${repositoryPath(exceptionsFile)}: duplicate exception path ${path}`)
    exceptions.set(path, exception.reason.trim())
  }
  return exceptions
}

function changedImagePaths(root, base) {
  const changedPaths = execFileSync(
    'git',
    ['diff', '--no-ext-diff', '--diff-filter=AMR', '--name-only', '-z', `${base}...HEAD`, '--'],
    { cwd: root }
  )
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map(repositoryPath)
  return changedPaths.filter((filePath) => IMAGE_EXTENSION.test(filePath))
}

export function validateImageBudget({
  root = process.cwd(),
  changedFiles,
  exceptions = new Map(),
  budgetBytes = DEFAULT_BUDGET_BYTES,
}) {
  const errors = []
  const checkedFiles = []
  const acceptedExceptions = []

  for (const inputPath of changedFiles) {
    const filePath = repositoryPath(inputPath)
    if (!IMAGE_EXTENSION.test(filePath)) continue

    const absolutePath = resolve(root, filePath)
    const relativePath = relative(root, absolutePath)
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      errors.push(`Image path is outside the repository: ${filePath}`)
      continue
    }

    const size = statSync(absolutePath).size
    checkedFiles.push({ path: filePath, size })
    if (size <= budgetBytes) continue

    const reason = exceptions.get(filePath)
    if (reason) {
      acceptedExceptions.push({ path: filePath, size, reason })
    } else {
      errors.push(
        `${filePath} is ${size} bytes, above the ${budgetBytes}-byte budget; compress it or add an exact path and reason to the exception file`
      )
    }
  }

  for (const filePath of exceptions.keys()) {
    const absolutePath = resolve(root, filePath)
    const relativePath = relative(root, absolutePath)
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      errors.push(`image exception path is outside the repository: ${filePath}`)
      continue
    }
    if (!existsSync(absolutePath)) {
      errors.push(`stale image exception: ${filePath}`)
      continue
    }
    const stat = statSync(absolutePath)
    if (!stat.isFile() || stat.size <= budgetBytes)
      errors.push(`stale image exception: ${filePath}`)
  }

  return { errors, checkedFiles, acceptedExceptions }
}

function parseArguments(args) {
  const options = {
    root: process.cwd(),
    exceptionsFile: DEFAULT_EXCEPTIONS_FILE,
    budgetBytes: DEFAULT_BUDGET_BYTES,
    help: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }
    if (!['--base', '--root', '--exceptions-file', '--budget-bytes'].includes(argument)) {
      throw new Error(`Unknown option: ${argument}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`)
    index += 1
    const key = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    options[key] = key === 'budgetBytes' ? Number(value) : value
  }

  if (!options.help && !options.base) throw new Error('Provide --base <git-ref>')
  if (!Number.isSafeInteger(options.budgetBytes) || options.budgetBytes <= 0) {
    throw new Error('--budget-bytes must be a positive integer')
  }
  options.root = resolve(options.root)
  return options
}

export function run(args) {
  try {
    const options = parseArguments(args)
    if (options.help) return { exitCode: 0, stdout: `${usage()}\n`, stderr: '' }

    const exceptions = readExceptions(options.root, options.exceptionsFile)
    const changedFiles = changedImagePaths(options.root, options.base)
    const result = validateImageBudget({
      root: options.root,
      changedFiles,
      exceptions,
      budgetBytes: options.budgetBytes,
    })

    if (result.errors.length > 0) {
      return { exitCode: 1, stdout: '', stderr: `${result.errors.join('\n')}\n` }
    }
    if (result.checkedFiles.length === 0) {
      return {
        exitCode: 0,
        stdout: 'No changed PNG/JPG/JPEG assets; image budget passed.\n',
        stderr: '',
      }
    }

    const exceptionOutput = result.acceptedExceptions
      .map(({ path, size, reason }) => `\nException: ${path} (${size} bytes) — ${reason}`)
      .join('')
    return {
      exitCode: 0,
      stdout: `Image budget passed: ${result.checkedFiles.length} changed PNG/JPG/JPEG asset(s), max ${options.budgetBytes} bytes.${exceptionOutput}\n`,
      stderr: '',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { exitCode: 2, stdout: '', stderr: `${message}\n${usage()}\n` }
  }
}

export function usage() {
  return (
    'Usage: node scripts/check-image-budget.mjs --base <git-ref> [--root <path>] ' +
    '[--exceptions-file <path>] [--budget-bytes <integer>]'
  )
}

function main() {
  const result = run(process.argv.slice(2))
  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  if (result.exitCode !== 0) process.exitCode = result.exitCode
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
