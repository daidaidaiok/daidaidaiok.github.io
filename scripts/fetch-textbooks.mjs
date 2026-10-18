/**
 * fetch-textbooks.mjs
 *
 * 从 TapXWorld/ChinaTextbook 仓库拉取目录树，解析出全部教材（PDF）信息，
 * 生成 public/data/textbooks.json 供 /textbooks 页面展示。
 *
 * 用法：
 *   node ./scripts/fetch-textbooks.mjs                     # 从 GitHub API 拉取
 *   node ./scripts/fetch-textbooks.mjs <tree.json>         # 使用本地 tree JSON（调试/离线）
 *   node ./scripts/fetch-textbooks.mjs --from-existing     # 由现有 textbooks.json 离线迁移到当前 schema
 *
 * 说明：
 *   - 超过 50MB 的 PDF 会被仓库拆成约 35MB 的分片（xxx.pdf.1、xxx.pdf.2 ...），
 *     分片可能放在 `<书名>.pdf_merge_folder/` 下，也可能直接散落在普通目录。
 *     脚本会把分片归组到同一本教材，并提供每个分片的路径。
 *   - 数据里不存绝对 URL：每个文件只存相对仓库根的未编码路径 `p`，
 *     前端按 `source.rawBase + encodePath(p)` 现拼下载链接，省掉近 900KB 冗余。
 *
 * schema v2（books 条目）：
 *   { id, title, stage, subject, version?, publisher?, grade?, series?,
 *     files: [{ p, size }], totalSize, split? }
 *   - `id` 同时是主 PDF 路径（React key / GitHub 页面链接来源），不再重复存 `path`
 *   - `stageDisplay` 由前端映射，不再落盘
 *   - 空字符串字段直接省略，`split` 仅在 true 时输出
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_OWNER = 'TapXWorld'
const REPO_NAME = 'ChinaTextbook'
const DEFAULT_BRANCH = 'master'
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
const TREE_URL = `${API_BASE}/git/trees/${DEFAULT_BRANCH}?recursive=1`

const SCHEMA_VERSION = 2

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '..', 'public', 'data', 'textbooks.json')

const STAGE_ORDER = [
  '小学',
  '初中',
  '高中',
  '大学',
  '小学（五•四学制）',
  '初中（五•四学制）',
  '学数学最重要的刷习题在这里',
]

const SOURCE = {
  repo: `${REPO_OWNER}/${REPO_NAME}`,
  htmlUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
  defaultBranch: DEFAULT_BRANCH,
  mergeToolUrl: 'https://github.com/TapXWorld/ChinaTextbook-tools/releases',
  rawBase: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DEFAULT_BRANCH}/`,
}

/** 目录名解析：`人教版-人民教育出版社` → { version: '人教版', publisher: '人民教育出版社' } */
function parsePublisher(dirName) {
  const idx = dirName.indexOf('-')
  if (idx > 0) {
    return {
      version: dirName.slice(0, idx).trim(),
      publisher: dirName.slice(idx + 1).trim(),
    }
  }
  return { version: dirName, publisher: '' }
}

/** 从 GitHub 拉取目录树 */
async function fetchTree() {
  const res = await fetch(TREE_URL, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'textbook-page-generator' },
  })
  if (!res.ok) {
    throw new Error(`GitHub API 请求失败: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  if (data.truncated) {
    console.warn('⚠️  目录树被截断，请稍后重试以获得完整数据')
  }
  return data.tree
}

/** 读取本地 tree JSON */
function readTreeFromFile(filePath) {
  const data = JSON.parse(readFileSync(filePath, 'utf8'))
  if (data.truncated) {
    console.warn('⚠️  目录树被截断，请稍后重试以获得完整数据')
  }
  return data.tree
}

/** 从路径解析教材元信息 */
function parseBookInfo(mainPath) {
  const segments = mainPath.split('/')
  const stage = segments[0]
  const subject = segments[1]
  const dirParts = segments.slice(1, -1) // 中间目录（不含文件名）

  let version = ''
  let publisher = ''
  let grade = ''
  let series = ''

  if (stage === '学数学最重要的刷习题在这里') {
    // 学数学最重要的刷习题在这里/初中练习题_带答案/<试卷集>/xxx.pdf
    series = dirParts[1] || ''
  } else if (dirParts.length >= 2) {
    const pub = parsePublisher(dirParts[1])
    version = pub.version
    publisher = pub.publisher
    if (dirParts.length >= 3) {
      grade = dirParts[2]
    }
  }

  return { stage, subject, version, publisher, grade, series }
}

/** 从文件名/目录名提取书名 */
function extractTitle(mainPath) {
  const fileName = mainPath.split('/').pop()
  return fileName.replace(/\.pdf$/i, '').trim()
}

/** 主文件路径：完整 PDF 或分片归组后的虚拟 PDF 路径 */
function buildMainPath(filePath) {
  const base = filePath.split('_merge_folder')[0]
  return base.replace(/\.pdf\.\d+$/i, '.pdf')
}

/** 解析目录树，生成教材列表 */
function buildBooks(tree) {
  const books = new Map() // key: 主文件路径

  const addBook = (mainPath, { filePath, size }) => {
    if (!books.has(mainPath)) {
      const info = parseBookInfo(mainPath)
      books.set(mainPath, {
        id: mainPath,
        title: extractTitle(mainPath),
        ...info,
        files: [],
        split: false,
      })
    }
    const book = books.get(mainPath)
    // 目录树偶发重复项，按路径去重
    if (book.files.some((f) => f.p === filePath)) return
    book.files.push({ p: filePath, size })
  }

  for (const item of tree) {
    if (item.type !== 'blob') continue
    const path = item.path

    // 只保留教材文件（PDF / 拆分的 PDF 分片 / DJVU）
    const isPdf = /\.pdf$/i.test(path)
    const isPdfPart = /\.pdf\.\d+$/i.test(path)
    const isDjvu = /\.djvu$/i.test(path)
    if (!isPdf && !isPdfPart && !isDjvu) continue

    // 忽略根目录散文件（README 等）
    if (!path.includes('/')) continue

    const size = item.size || 0

    if (isPdf || isDjvu) {
      // 完整文件（含 .djvu 老格式）
      addBook(path, { filePath: path, size })
    } else if (isPdfPart) {
      // 分片文件：归组到主文件
      const mainPath = buildMainPath(path)
      addBook(mainPath, { filePath: path, size })
      books.get(mainPath).split = true
    }
  }

  return [...books.values()]
}

/** 生成稳定的落盘结构：固定键序 + 省略空值，保证幂等比较可靠 */
function toBookRecord(book) {
  const record = {
    id: book.id,
    title: book.title,
    stage: book.stage,
    subject: book.subject,
  }
  if (book.version) record.version = book.version
  if (book.publisher) record.publisher = book.publisher
  if (book.grade) record.grade = book.grade
  if (book.series) record.series = book.series
  record.files = book.files.map((f) => ({ p: f.p, size: f.size }))
  record.totalSize = book.totalSize
  if (book.split) record.split = true
  return record
}

/** 排序 + 汇总 + 组装 payload（在线抓取与离线迁移共用） */
function finalize(booksArr, { generatedAt } = {}) {
  // 若仓库同时保留了完整 PDF 与旧分片，优先使用完整 PDF，忽略分片
  for (const book of booksArr) {
    const hasCompletePdf = book.files.some((f) => /\.pdf$/i.test(f.p))
    if (hasCompletePdf) {
      book.files = book.files.filter((f) => /\.pdf$/i.test(f.p))
      book.split = false
    }
    // 分片按数字序（pdf.2 在 pdf.10 之前）
    book.files.sort((x, y) => x.p.localeCompare(y.p, 'zh', { numeric: true }))
    book.totalSize = book.files.reduce((sum, f) => sum + f.size, 0)
  }

  // 排序：学段 → 科目 → 版本 → 书名
  const stageRank = (s) => {
    const i = STAGE_ORDER.indexOf(s)
    return i === -1 ? STAGE_ORDER.length : i
  }
  booksArr.sort((a, b) => {
    return (
      stageRank(a.stage) - stageRank(b.stage) ||
      (a.subject || '').localeCompare(b.subject || '', 'zh') ||
      (a.version || '').localeCompare(b.version || '', 'zh') ||
      (a.title || '').localeCompare(b.title || '', 'zh')
    )
  })

  const records = booksArr.map(toBookRecord)

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: generatedAt || new Date().toISOString(),
    source: SOURCE,
    totalBooks: records.length,
    totalFiles: records.reduce((sum, b) => sum + b.files.length, 0),
    totalSizeBytes: records.reduce((sum, b) => sum + b.totalSize, 0),
    books: records,
  }
}

/** v1 → 内部结构：由完整 URL 反解出未编码相对路径 */
function booksFromExisting(old) {
  const rawBase = old.source?.rawBase
  if (!rawBase) throw new Error('旧数据缺少 source.rawBase，无法反解文件路径')

  return old.books.map((b) => {
    const files = b.files.map((f) => {
      let p = f.p
      if (!p) {
        if (!f.url || !f.url.startsWith(rawBase)) {
          throw new Error(`无法反解文件路径: ${b.id || b.path} / ${f.name || f.url}`)
        }
        p = f.url.slice(rawBase.length).split('/').map(decodeURIComponent).join('/')
      }
      return { p, size: f.size || 0 }
    })
    return {
      id: b.id || b.path,
      title: b.title,
      stage: b.stage,
      subject: b.subject,
      version: b.version,
      publisher: b.publisher,
      grade: b.grade,
      series: b.series,
      files,
      split: Boolean(b.split),
    }
  })
}

function readOldPayload() {
  if (!existsSync(OUT_PATH)) return null
  try {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  const fromExisting = process.argv.includes('--from-existing')
  const treeArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'))

  let payload
  if (fromExisting) {
    const old = readOldPayload()
    if (!old) throw new Error('未找到现有 textbooks.json，无法离线迁移')
    payload = finalize(booksFromExisting(old), { generatedAt: old.generatedAt })
  } else {
    const tree = treeArg ? readTreeFromFile(treeArg) : await fetchTree()
    payload = finalize(buildBooks(tree))
  }

  // 若数据内容未变化，保留旧 generatedAt，避免定时任务产生噪音提交
  const old = readOldPayload()
  if (old) {
    const oldCore = JSON.stringify({
      schemaVersion: old.schemaVersion ?? 1,
      source: old.source,
      books: old.books,
    })
    const newCore = JSON.stringify({
      schemaVersion: payload.schemaVersion,
      source: payload.source,
      books: payload.books,
    })
    if (oldCore === newCore && old.generatedAt) {
      payload.generatedAt = old.generatedAt
    }
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')

  console.log(`✅ 已生成 ${OUT_PATH}`)
  console.log(`   schema:   v${payload.schemaVersion}`)
  console.log(`   教材总数: ${payload.totalBooks}`)
  console.log(`   文件总数: ${payload.totalFiles}（含拆分分片）`)
  console.log(`   总大小:   ${(payload.totalSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB`)
  console.log(`   生成时间: ${payload.generatedAt}`)
}

main().catch((err) => {
  console.error('❌ 生成失败:', err.message)
  process.exit(1)
})
