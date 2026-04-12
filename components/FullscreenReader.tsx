'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface FullscreenReaderProps {
  children: ReactNode
  mode?: 'prose' | 'embed'
  title?: string
  description?: string
  externalUrl?: string
}

export default function FullscreenReader({
  children,
  mode = 'prose',
  title = '阅读模式',
  description = '进入全屏后可以专注浏览题目和参考作答',
  externalUrl,
}: FullscreenReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!containerRef.current) {
      return
    }

    try {
      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen()
      } else {
        await containerRef.current.requestFullscreen()
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen reader:', error)
    }
  }

  return (
    <div ref={containerRef} className="fullscreen-reader neo-surface overflow-hidden">
      <div className="fullscreen-toolbar flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 dark:border-white/8">
        <div>
          <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
            {title}
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</div>
        </div>
        <div className="flex items-center gap-2">
          {externalUrl ? (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={externalUrl}
              className="neo-inset px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
            >
              新窗口打开
            </a>
          ) : null}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-pressed={isFullscreen}
            className="neo-inset min-w-28 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
          >
            {isFullscreen ? '退出全屏' : '全屏阅读'}
          </button>
        </div>
      </div>
      <div
        className={
          mode === 'embed'
            ? 'fullscreen-embed bg-black/2 p-0 dark:bg-white/[0.03]'
            : 'fullscreen-prose px-6 py-8 sm:px-8 sm:py-10'
        }
      >
        <div
          className={
            mode === 'embed'
              ? isFullscreen
                ? 'h-[calc(100vh-88px)]'
                : 'h-[78vh] min-h-[720px]'
              : 'prose dark:prose-invert max-w-none'
          }
        >
          {children}
        </div>
      </div>
    </div>
  )
}
