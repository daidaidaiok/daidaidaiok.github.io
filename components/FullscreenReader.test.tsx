import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FullscreenReader from './FullscreenReader'

describe('FullscreenReader', () => {
  it('shows a pointer cursor on the fullscreen toggle', () => {
    render(<FullscreenReader>阅读内容</FullscreenReader>)

    expect(screen.getByRole('button', { name: '全屏阅读' })).toHaveClass('cursor-pointer')
  })
})
