import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CopyLinkButton from './CopyLinkButton'

let clipboardDescriptor: PropertyDescriptor | undefined

afterEach(() => {
  vi.useRealTimers()
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  else Reflect.deleteProperty(navigator, 'clipboard')
  clipboardDescriptor = undefined
})

describe('CopyLinkButton', () => {
  it('shows a pointer cursor for its click action', () => {
    render(<CopyLinkButton url="https://example.com" />)

    expect(screen.getByRole('button', { name: '复制链接' })).toHaveClass('cursor-pointer')
  })

  it('uses a decorative SVG for the copied state and keeps its accessible text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    vi.useFakeTimers()

    render(<CopyLinkButton url="https://example.com" />)
    const button = screen.getByRole('button', { name: '复制链接' })

    await act(async () => {
      fireEvent.click(button)
      await Promise.resolve()
    })

    const copiedButton = screen.getByRole('button', { name: /已复制/ })
    expect(writeText).toHaveBeenCalledWith('https://example.com')
    expect(copiedButton).toHaveTextContent('已复制')
    expect(copiedButton).not.toHaveTextContent('✓')
    expect(copiedButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    act(() => vi.runOnlyPendingTimers())
  })
})
