import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Bookshelf from './page'

describe('bookshelf page', () => {
  it('has one visible page heading before book titles', () => {
    const { container } = render(<Bookshelf />)
    const pageHeading = screen.getByRole('heading', { level: 1, name: '书架' })
    const firstBookHeading = screen.getByRole('heading', { level: 2, name: '资本论' })

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      pageHeading.compareDocumentPosition(firstBookHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(container).toHaveTextContent('浏览精选书籍，查找适合阅读与学习的作品。')
  })
})
