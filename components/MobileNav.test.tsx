import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MobileNav from './MobileNav'

async function openMobileNav() {
  render(<MobileNav />)

  await act(async () => {
    await Promise.resolve()
  })

  fireEvent.click(screen.getByRole('button', { name: '切换菜单' }))
}

describe('MobileNav keyboard focus styles', () => {
  it('keeps top-level and submenu links free of outline-0 so global focus-visible can show', async () => {
    await openMobileNav()

    fireEvent.click(screen.getByRole('button', { name: /考研/ }))

    const topLevelLink = screen.getByRole('link', { name: '博客' })
    const submenuLink = screen.getByRole('link', { name: /混凝土结构设计原理/ })

    expect(topLevelLink).not.toHaveClass('outline-0')
    expect(submenuLink).not.toHaveClass('outline-0')
  })
})
