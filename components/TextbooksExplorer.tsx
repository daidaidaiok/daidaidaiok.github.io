'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from '@/components/Link'

/** 每个文件只存相对仓库根的未编码路径，下载链接运行时拼接 */
interface TextbookFile {
  p: string
  size: number
}

interface Textbook {
  id: string
  title: string
  stage: string
  subject: string
  version?: string
  publisher?: string
  grade?: string
  series?: string
  files: TextbookFile[]
  totalSize: number
  split?: boolean
}

interface TextbookSource {
  repo: string
  htmlUrl: string
  defaultBranch: string
  mergeToolUrl: string
  rawBase: string
}

interface TextbookData {
  schemaVersion?: number
  generatedAt: string
  source: TextbookSource
  totalBooks: number
  totalFiles: number
  totalSizeBytes: number
  books: Textbook[]
}

/** 兼容 schema v1（files[].url + path + stageDisplay）与 v2（files[].p） */
interface RawBook {
  id?: string
  path?: string
  title?: string
  stage?: string
  subject?: string
  version?: string
  publisher?: string
  grade?: string
  series?: string
  stageDisplay?: string
  totalSize?: number
  split?: boolean
  files?: { p?: string; url?: string; size?: number; name?: string }[]
}

const SUBJECT_DISPLAY: Record<string, string> = {
  初中练习题_带答案: '初中练习题（带答案）',
}

/** 学段 → 展示名（数据里不再落盘 stageDisplay） */
const STAGE_DISPLAY: Record<string, string> = {
  小学: '小学',
  初中: '初中',
  高中: '高中',
  大学: '大学',
  '小学（五•四学制）': '小学（五四学制）',
  '初中（五•四学制）': '初中（五四学制）',
  学数学最重要的刷习题在这里: '刷习题',
}

function stageLabel(stage: string): string {
  return STAGE_DISPLAY[stage] || stage
}

/** 科目 → 封面徽章单字 */
const SUBJECT_ICON: Record<string, string> = {
  语文: '文',
  数学: '数',
  英语: '英',
  物理: '理',
  化学: '化',
  生物学: '生',
  历史: '史',
  地理: '地',
  地理图册: '图',
  人文地理: '地',
  道德与法治: '德',
  思想政治: '政',
  科学: '科',
  音乐: '音',
  美术: '美',
  艺术: '艺',
  体育与健康: '体',
  信息技术: '息',
  通用技术: '技',
  日语: '日',
  俄语: '俄',
  高等数学: '高',
  线性代数: '线',
  概率论: '率',
  离散数学: '离',
  语文·书法练习指导: '书',
  初中练习题_带答案: '练',
}

function subjectIcon(subject: string): string {
  return SUBJECT_ICON[subject] || subject.charAt(0) || '书'
}

const COVER_COLORS = [
  '#b91c1c', // red-700
  '#c2410c', // orange-700
  '#a16207', // yellow-700
  '#15803d', // green-700
  '#0f766e', // teal-700
  '#0e7490', // cyan-700
  '#1d4ed8', // blue-700
  '#4338ca', // indigo-700
  '#6d28d9', // violet-700
  '#a21caf', // fuchsia-700
  '#be185d', // pink-700
  '#334155', // slate-700
]

/** 首屏与每次追加的封面数（约 96 张 ≈ 1.5 千 DOM 节点） */
const INITIAL_COUNT = 96
const BATCH_SIZE = 96

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** 逐段编码，保留 `/` 分隔符 */
function encodePath(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/')
}

function fileUrl(rawBase: string, p: string): string {
  return rawBase + encodePath(p)
}

function fileName(p: string): string {
  return p.split('/').pop() || p
}

function formatSize(bytes: number): string {
  if (!bytes) return '未知大小'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

/** v1/v2 归一化：文件统一为 { p, size }，去掉 path / stageDisplay 等冗余字段 */
function normalizePayload(raw: {
  schemaVersion?: number
  generatedAt: string
  source: TextbookSource
  totalBooks?: number
  totalFiles?: number
  totalSizeBytes?: number
  books?: RawBook[]
}): TextbookData {
  const rawBase = raw.source?.rawBase || ''
  const books: Textbook[] = (raw.books || []).map((book) => {
    const files: TextbookFile[] = []
    for (const file of book.files || []) {
      if (file.p) {
        files.push({ p: file.p, size: file.size || 0 })
      } else if (file.url && rawBase && file.url.startsWith(rawBase)) {
        files.push({
          p: file.url.slice(rawBase.length).split('/').map(decodeURIComponent).join('/'),
          size: file.size || 0,
        })
      }
    }
    return {
      id: book.id || book.path || '',
      title: book.title || '',
      stage: book.stage || '',
      subject: book.subject || '',
      version: book.version,
      publisher: book.publisher,
      grade: book.grade,
      series: book.series,
      files,
      totalSize: book.totalSize || files.reduce((sum, f) => sum + f.size, 0),
      split: Boolean(book.split),
    }
  })

  return {
    schemaVersion: raw.schemaVersion,
    generatedAt: raw.generatedAt,
    source: raw.source,
    totalBooks: raw.totalBooks || books.length,
    totalFiles: raw.totalFiles || books.reduce((sum, b) => sum + b.files.length, 0),
    totalSizeBytes: raw.totalSizeBytes || books.reduce((sum, b) => sum + b.totalSize, 0),
    books,
  }
}

const BookCover = memo(function BookCover({
  book,
  onSelect,
}: {
  book: Textbook
  onSelect: (book: Textbook) => void
}) {
  const key = book.version || book.subject || book.title
  const color = COVER_COLORS[hashString(key) % COVER_COLORS.length]
  const footer = book.publisher || book.version || '电子教材'

  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className="group relative flex w-full flex-col overflow-hidden rounded-md text-left text-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ aspectRatio: '3 / 4', backgroundColor: color }}
      aria-label={`查看《${book.title}》下载信息`}
    >
      {/* 光影渐变，模拟纸质封面层次 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(165deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      {/* 封面几何装饰 */}
      <div className="pointer-events-none absolute -top-5 -right-5 h-16 w-16 rounded-full border-[3px] border-white/20" />
      <div className="pointer-events-none absolute top-9 -left-4 h-8 w-8 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -right-3 bottom-8 h-12 w-12 rotate-12 bg-white/5" />

      {/* 书脊阴影 + 高光线 */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-black/30" />
      <div className="absolute inset-y-0 left-1.5 w-px bg-white/20" />

      <div className="relative flex h-full flex-col p-2.5 sm:p-3">
        {/* 顶部：学段抬头 */}
        <div className="truncate text-center text-[9px] font-bold tracking-[0.18em] text-white uppercase opacity-95">
          {stageLabel(book.stage)}
        </div>
        <div className="mx-auto mt-1 h-px w-8 bg-white/40" />

        {/* 中央：科目徽章 + 书名 + 年级 */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 text-center">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold ring-1 ring-white/45 sm:h-7 sm:w-7">
            {subjectIcon(book.subject)}
          </span>
          <span className="line-clamp-4 text-xs leading-snug font-extrabold drop-shadow-sm sm:text-sm">
            {book.title}
          </span>
          {book.grade ? (
            <span className="line-clamp-1 text-[10px] font-semibold text-white/85">
              {book.grade}
            </span>
          ) : null}
        </div>

        {/* 底部：出版社 + 大小/分片 */}
        <div className="mt-1 flex items-end justify-between gap-1 text-[9px] font-semibold text-white/85">
          <span className="min-w-0 truncate">{footer}</span>
          {book.split ? (
            <span className="shrink-0 rounded-sm bg-black/30 px-1 py-px text-[8px] font-bold">
              {book.files.length} 片
            </span>
          ) : (
            <span className="shrink-0">{formatSize(book.totalSize)}</span>
          )}
        </div>
      </div>
    </button>
  )
})

function DownloadModal({
  book,
  source,
  onClose,
}: {
  book: Textbook
  source: TextbookSource
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const githubPageUrl = `${source.htmlUrl}/blob/${source.defaultBranch}/${encodePath(book.id)}`

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`《${book.title}》下载信息`}
    >
      <button
        type="button"
        aria-label="关闭下载面板"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="neo-surface relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
              {stageLabel(book.stage)} · {SUBJECT_DISPLAY[book.subject] || book.subject}
            </div>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl dark:text-gray-100">
              {book.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neo-inset flex h-9 w-9 shrink-0 items-center justify-center text-gray-600 transition hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {(book.version || book.publisher || book.grade || book.series) && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
            {book.version ? (
              <span className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1.5">
                版本：{book.version}
              </span>
            ) : null}
            {book.publisher ? (
              <span className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1.5">
                出版社：{book.publisher}
              </span>
            ) : null}
            {book.grade ? (
              <span className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1.5">
                {book.grade}
              </span>
            ) : null}
            {book.series ? (
              <span className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1.5">
                {book.series}
              </span>
            ) : null}
          </div>
        )}

        {book.split ? (
          <div className="mt-5 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-semibold">
              ⚠️ 该教材超过 50MB，已被拆分为 {book.files.length} 个分片。
            </p>
            <p className="mt-1">
              请下载全部文件后，使用仓库提供的合并工具合并为完整
              PDF（分片放在同一目录，运行工具即可自动合并）。
            </p>
            <Link
              href={source.mergeToolUrl}
              className="mt-2 inline-block font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-amber-300"
            >
              下载合并工具 ↗
            </Link>
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          {book.files.map((file, index) => (
            <div
              key={file.p}
              className="bg-neo-item-light dark:bg-neo-item-dark flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {fileName(file.p)}
                </div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {formatSize(file.size)}
                  {book.split ? ` · 第 ${index + 1}/${book.files.length} 个分片` : ''}
                </div>
              </div>
              <Link
                href={fileUrl(source.rawBase, file.p)}
                className="neo-inset shrink-0 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
              >
                下载
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <span>
            共 {book.files.length} 个文件 · {formatSize(book.totalSize)}
          </span>
          <Link href={githubPageUrl} className="font-semibold underline-offset-4 hover:underline">
            在 GitHub 上查看 ↗
          </Link>
        </div>

        <p className="mt-4 text-xs leading-5 text-gray-400 dark:text-gray-500">
          数据来自开源仓库 TapXWorld/ChinaTextbook，仅供学习交流，请下载后 24 小时内删除。
        </p>
      </div>
    </div>
  )
}

interface RenderSection {
  key: string
  subjectName: string
  versionName: string
  total: number
  items: Textbook[]
}

export default function TextbooksExplorer({ basePath = '' }: { basePath?: string }) {
  const [data, setData] = useState<TextbookData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<string>('小学')
  const [subject, setSubject] = useState<string>('全部')
  const [version, setVersion] = useState<string>('全部')
  const [query, setQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState<Textbook | null>(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    // ?v=2 换缓存键，避免命中 CDN 上缓存的 schema v1 数据
    fetch(`${basePath}/data/textbooks.json?v=2`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(normalizePayload(json))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [basePath])

  const stages = useMemo(() => {
    if (!data) return []
    return [...new Set(data.books.map((b) => b.stage))]
  }, [data])

  const subjects = useMemo(() => {
    if (!data) return []
    return [...new Set(data.books.filter((b) => b.stage === stage).map((b) => b.subject))].sort(
      (a, b) => a.localeCompare(b, 'zh')
    )
  }, [data, stage])

  const versions = useMemo(() => {
    if (!data) return []
    return [
      ...new Set(
        data.books
          .filter((b) => b.stage === stage && (subject === '全部' || b.subject === subject))
          .map((b) => b.version)
          .filter((v): v is string => Boolean(v))
      ),
    ].sort((a, b) => a.localeCompare(b, 'zh'))
  }, [data, stage, subject])

  const filteredBooks = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.books.filter((book) => {
      if (stage !== '全部' && book.stage !== stage) return false
      if (subject !== '全部' && book.subject !== subject) return false
      if (version !== '全部' && book.version !== version) return false
      if (!q) return true
      return [book.title, book.subject, book.version, book.publisher, book.grade, book.series]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(q))
    })
  }, [data, stage, subject, version, query])

  const groups = useMemo(() => {
    const map = new Map<string, Textbook[]>()
    for (const book of filteredBooks) {
      const key = `${book.subject}||${book.version || '未标注版本'}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(book)
    }
    return [...map.entries()].map(([key, items]) => {
      const [subjectName, versionName] = key.split('||')
      return { key, subjectName, versionName, items }
    })
  }, [filteredBooks])

  // 按封面数（而非分组数）控制首屏渲染量，单组可能上百本
  const renderSections = useMemo(() => {
    let budget = visibleCount
    const out: RenderSection[] = []
    for (const group of groups) {
      if (budget <= 0) break
      const items = group.items.slice(0, budget)
      budget -= items.length
      out.push({
        key: group.key,
        subjectName: group.subjectName,
        versionName: group.versionName,
        total: group.items.length,
        items,
      })
    }
    return out
  }, [groups, visibleCount])

  const totalCount = filteredBooks.length
  const shownCount = Math.min(visibleCount, totalCount)
  const hasMore = shownCount < totalCount

  // 筛选条件变化时同步重置分页（渲染期调整 state，避免旧列表多闪一帧）
  const filterKey = `${stage}\u0000${subject}\u0000${version}\u0000${query.trim()}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setVisibleCount(INITIAL_COUNT)
  }

  const loadMore = useCallback(() => {
    setVisibleCount((count) => count + BATCH_SIZE)
  }, [])

  // 滚动到哨兵附近时自动追加一批；按钮为无 IntersectionObserver / 无障碍场景兜底
  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect() // 先断开，避免同一帧内连锁加载全部
          loadMore()
        }
      },
      { rootMargin: '600px 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, shownCount, loadMore])

  const selectStage = useCallback((s: string) => {
    setStage(s)
    setSubject('全部')
    setVersion('全部')
  }, [])

  const selectSubject = useCallback((s: string) => {
    setSubject(s)
    setVersion('全部')
  }, [])

  if (error) {
    return (
      <div className="neo-surface p-8 text-center">
        <p className="text-red-600 dark:text-red-400">教材数据加载失败：{error}</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          请稍后刷新页面重试，或前往
          <Link
            href="https://github.com/TapXWorld/ChinaTextbook"
            className="mx-1 font-semibold underline-offset-4 hover:underline"
          >
            原始仓库
          </Link>
          查看。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Hero */}
      <section className="neo-surface p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)] lg:items-end">
          <div>
            <div className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
              免费教材库
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              中小学 & 大学教材下载
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600 dark:text-gray-300">
              这里汇集了国内小初高、大学各版本教材的 PDF 电子版，数据来自开源仓库
              <Link
                href="https://github.com/TapXWorld/ChinaTextbook"
                className="text-primary-500 mx-1 font-semibold underline-offset-4 hover:underline"
              >
                TapXWorld/ChinaTextbook
              </Link>
              。点击封面即可下载。封面按出版社（版本）统一配色，同版本教材同色展示，方便快速找到学校使用的教材。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-5 py-4">
              <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                教材总数
              </div>
              <div className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                {data ? data.totalBooks : '—'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-4 py-3">
                <div className="text-[10px] font-semibold tracking-[0.18em] text-gray-500 uppercase dark:text-gray-400">
                  总大小
                </div>
                <div className="mt-1 text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  {data ? `${(data.totalSizeBytes / 1024 / 1024 / 1024).toFixed(1)} GB` : '—'}
                </div>
              </div>
              <div className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-4 py-3">
                <div className="text-[10px] font-semibold tracking-[0.18em] text-gray-500 uppercase dark:text-gray-400">
                  更新于
                </div>
                <div className="mt-1 text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  {data ? formatDate(data.generatedAt) : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 筛选区 */}
      {data ? (
        <>
          <section className="neo-surface space-y-4 p-5 sm:p-6">
            {/* 学段 Tab */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => selectStage('全部')}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  stage === '全部'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-neo-item-light dark:bg-neo-item-dark text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                全部
              </button>
              {stages.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectStage(s)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    stage === s
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-neo-item-light dark:bg-neo-item-dark text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  {stageLabel(s)}
                </button>
              ))}
            </div>

            {/* 科目 chips */}
            {subjects.length > 0 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => selectSubject('全部')}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    subject === '全部'
                      ? 'bg-primary-500 text-white'
                      : 'bg-neo-item-light dark:bg-neo-item-dark text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  全部科目
                </button>
                {subjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => selectSubject(s)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      subject === s
                        ? 'bg-primary-500 text-white'
                        : 'bg-neo-item-light dark:bg-neo-item-dark text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white'
                    }`}
                  >
                    {SUBJECT_DISPLAY[s] || s}
                  </button>
                ))}
              </div>
            )}

            {/* 版本下拉 + 搜索 */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="ios-radius bg-neo-item-light focus:ring-primary-500 dark:bg-neo-item-dark w-full border-none px-4 py-2 text-sm font-medium text-gray-700 focus:ring-2 sm:w-56 dark:text-gray-200"
                aria-label="按版本筛选"
              >
                <option value="全部">全部版本 / 出版社</option>
                {versions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索书名 / 科目 / 出版社…"
                className="ios-radius bg-neo-item-light focus:ring-primary-500 dark:bg-neo-item-dark w-full border-none px-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 dark:text-gray-200 dark:placeholder-gray-500"
                aria-label="搜索教材"
              />
            </div>

            {/* 结果统计 */}
            <div className="text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase dark:text-gray-400">
              共 {totalCount} 本教材
              {query.trim() ? ` · 搜索“${query.trim()}”` : ''}
            </div>
          </section>

          {/* 封面墙 */}
          {totalCount === 0 ? (
            <div className="neo-surface p-10 text-center text-gray-500 dark:text-gray-400">
              没有找到匹配的教材，试试更换筛选条件或搜索关键词。
            </div>
          ) : (
            <div className="space-y-8">
              {renderSections.map((section) => (
                <section
                  key={section.key}
                  className="space-y-3 [contain-intrinsic-size:auto_480px] [content-visibility:auto]"
                >
                  <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    <span>{SUBJECT_DISPLAY[section.subjectName] || section.subjectName}</span>
                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      {section.versionName}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                      {section.items.length === section.total
                        ? `${section.total} 本`
                        : `已显示 ${section.items.length} / ${section.total} 本`}
                    </span>
                  </h2>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                    {section.items.map((book) => (
                      <BookCover key={book.id} book={book} onSelect={setSelectedBook} />
                    ))}
                  </div>
                </section>
              ))}

              <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                已显示 {shownCount} / {totalCount} 本教材
              </p>

              {hasMore ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="neo-inset px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
                  >
                    加载更多教材
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    已显示 {shownCount} / {totalCount} 本
                  </p>
                </div>
              ) : null}

              <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
            </div>
          )}
        </>
      ) : (
        <div className="neo-surface flex items-center justify-center p-16 text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="border-t-primary-500 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 motion-reduce:animate-none" />
            正在加载教材数据…
          </div>
        </div>
      )}

      {/* 下载弹窗 */}
      {selectedBook && data ? (
        <DownloadModal
          book={selectedBook}
          source={data.source}
          onClose={() => setSelectedBook(null)}
        />
      ) : null}
    </div>
  )
}
