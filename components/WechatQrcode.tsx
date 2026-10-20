'use client'

import { useEffect, useState } from 'react'
import { Wechat } from '@/components/social-icons/icons'
import Image from '@/components/Image'

const WECHAT_ACCOUNT = '人工石教育'
const WECHAT_ID = 'galigaygay_ok'

export default function WechatQrcode() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label="微信公众号二维码"
        onClick={() => setOpen(true)}
        className="text-sm text-gray-500 transition hover:text-gray-600"
      >
        <Wechat className="hover:text-primary-500 dark:hover:text-primary-400 h-6 w-6 fill-current text-gray-700 dark:text-gray-200" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4"
          role="button"
          tabIndex={-1}
          aria-label="关闭二维码弹窗"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        >
          <div
            className="relative w-72 rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
            aria-label={`${WECHAT_ACCOUNT} 微信公众号二维码`}
          >
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <p className="mb-4 text-center text-lg font-bold text-gray-800 dark:text-gray-100">
              {WECHAT_ACCOUNT}
            </p>
            <Image
              src="/static/images/wechat-qrcode.jpg"
              alt={`${WECHAT_ACCOUNT} 微信公众号二维码`}
              width={224}
              height={224}
              className="mx-auto h-56 w-56 rounded-lg object-contain"
            />
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              微信号：{WECHAT_ID}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
