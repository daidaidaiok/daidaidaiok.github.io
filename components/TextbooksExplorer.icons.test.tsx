import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TextbooksExplorer from './TextbooksExplorer'

const textbookData = {
  schemaVersion: 2,
  generatedAt: '2026-11-02T00:00:00.000Z',
  source: {
    repo: 'TapXWorld/ChinaTextbook',
    htmlUrl: 'https://github.com/TapXWorld/ChinaTextbook',
    defaultBranch: 'main',
    mergeToolUrl: 'https://github.com/TapXWorld/ChinaTextbook',
    rawBase: 'https://raw.githubusercontent.com/TapXWorld/ChinaTextbook/main',
  },
  totalBooks: 1,
  totalFiles: 1,
  totalSizeBytes: 60_000_000,
  books: [
    {
      id: 'sample-book',
      title: '测试教材',
      stage: '小学',
      subject: '语文',
      files: [{ p: 'sample.pdf', size: 60_000_000 }],
      totalSize: 60_000_000,
      split: true,
    },
  ],
}

afterEach(() => vi.unstubAllGlobals())

describe('TextbooksExplorer modal icons', () => {
  it('uses decorative SVG icons and preserves close/warning semantics', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => textbookData,
      })
    )

    render(<TextbooksExplorer />)
    fireEvent.click(await screen.findByRole('button', { name: '查看《测试教材》下载信息' }))

    const dialog = screen.getByRole('dialog', { name: '《测试教材》下载信息' })
    const closeButton = within(dialog).getByRole('button', { name: '关闭' })
    const warning = screen.getByText(/该教材超过 50MB/)

    expect(closeButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(closeButton).not.toHaveTextContent('✕')
    expect(warning).toHaveTextContent('该教材超过 50MB')
    expect(warning).not.toHaveTextContent('⚠️')
    expect(warning.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
