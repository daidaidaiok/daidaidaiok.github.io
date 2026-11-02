import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CopyLinkButton from './CopyLinkButton'

describe('CopyLinkButton', () => {
  it('shows a pointer cursor for its click action', () => {
    render(<CopyLinkButton url="https://example.com" />)

    expect(screen.getByRole('button', { name: '复制链接' })).toHaveClass('cursor-pointer')
  })
})
