'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'

interface FullscreenReaderProps {
  children: ReactNode
}

export default function FullscreenReader({ children }: FullscreenReaderProps) {
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
            阅读模式
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            进入全屏后可以专注浏览题目和参考作答
          </div>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-pressed={isFullscreen}
          className="neo-inset min-w-28 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
        >
          {isFullscreen ? '退出全屏' : '全屏阅读'}
        </button>
      </div>
      <div className="fullscreen-prose px-6 py-8 sm:px-8 sm:py-10">
        <div className="prose dark:prose-invert max-w-none">{children}</div>
      </div>
    </div>
  )
}
