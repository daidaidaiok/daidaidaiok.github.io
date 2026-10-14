/**
 * fetch-textbooks.mjs
 *
 * 从 TapXWorld/ChinaTextbook 仓库拉取目录树，解析出全部教材（PDF）信息，
 * 生成 public/data/textbooks.json 供 /textbooks 页面展示。
 *
 * 用法：
 *   node ./scripts/fetch-textbooks.mjs                 # 从 GitHub API 拉取
 *   node ./scripts/fetch-textbooks.mjs <tree.json>     # 使用本地 tree JSON（调试/离线）
 *
 * 说明：
 *   - 超过 50MB 的 PDF 会被仓库拆成约 35MB 的分片（xxx.pdf.1、xxx.pdf.2 ...），
 *     分片可能放在 `<书名>.pdf_merge_folder/` 下，也可能直接散落在普通目录。
 *     脚本会把分片归组到同一本教材，并提供每个分片的下载链接。
 *   - 下载链接使用 raw.githubusercontent.com，浏览器可直接下载。
 */

import { writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_OWNER = 'TapXWorld'
const REPO_NAME = 'ChinaTextbook'
const DEFAULT_BRANCH = 'master'
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
const TREE_URL = `${API_BASE}/git/trees/${DEFAULT_BRANCH}?recursive=1`

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

const STAGE_DISPLAY = {
  小学: '小学',
  初中: '初中',
  高中: '高中',
  大学: '大学',
  '小学（五•四学制）': '小学（五四学制）',
  '初中（五•四学制）': '初中（五四学制）',
  学数学最重要的刷习题在这里: '刷习题',
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

/** 生成下载链接 */
function buildUrls(filePath) {
  const encoded = filePath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  return {
    raw: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DEFAULT_BRANCH}/${encoded}`,
    page: `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${DEFAULT_BRANCH}/${encoded}`,
  }
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
        stageDisplay: STAGE_DISPLAY[info.stage] || info.stage,
        path: mainPath,
        files: [],
        split: false,
      })
    }
    const book = books.get(mainPath)
    book.files.push({ name: filePath.split('/').pop(), size, url: buildUrls(filePath).raw })
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
      const book = books.get(mainPath)
      book.split = true
    }
  }

  const booksArr = [...books.values()]

  // 若仓库同时保留了完整 PDF 与旧分片，优先使用完整 PDF，忽略分片
  for (const book of booksArr) {
    const hasCompletePdf = book.files.some((f) => /\.pdf$/i.test(f.name))
    if (hasCompletePdf) {
      book.files = book.files.filter((f) => /\.pdf$/i.test(f.name))
      book.split = false
    }
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
      a.subject.localeCompare(b.subject, 'zh') ||
      a.version.localeCompare(b.version, 'zh') ||
      a.title.localeCompare(b.title, 'zh')
    )
  })

  // 每个 book 的 files 按文件名排序
  for (const book of booksArr) {
    book.files.sort((x, y) => x.name.localeCompare(y.name, 'zh'))
  }

  const totalSizeBytes = booksArr.reduce((sum, b) => sum + b.totalSize, 0)

  return {
    generatedAt: new Date().toISOString(),
    source: {
      repo: `${REPO_OWNER}/${REPO_NAME}`,
      htmlUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
      defaultBranch: DEFAULT_BRANCH,
      mergeToolUrl: 'https://github.com/TapXWorld/ChinaTextbook-tools/releases',
      rawBase: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DEFAULT_BRANCH}/`,
    },
    totalBooks: booksArr.length,
    totalFiles: booksArr.reduce((sum, b) => sum + b.files.length, 0),
    totalSizeBytes,
    books: booksArr,
  }
}

async function main() {
  const treeArg = process.argv[2]
  const tree = treeArg ? readTreeFromFile(treeArg) : await fetchTree()

  const payload = buildBooks(tree)
  writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), 'utf8')

  console.log(`✅ 已生成 ${OUT_PATH}`)
  console.log(`   教材总数: ${payload.totalBooks}`)
  console.log(`   文件总数: ${payload.totalFiles}（含拆分分片）`)
  console.log(`   总大小:   ${(payload.totalSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB`)
  console.log(`   生成时间: ${payload.generatedAt}`)
}

main().catch((err) => {
  console.error('❌ 生成失败:', err.message)
  process.exit(1)
})
