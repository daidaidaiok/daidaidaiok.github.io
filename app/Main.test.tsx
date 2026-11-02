import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './Main'

const posts = [
  {
    id: 'post-1',
    slug: 'post-1',
    date: '2026-03-21',
    title: 'Accessibility test post',
    summary: 'A short test summary.',
    tags: ['claudecode'],
  },
]

describe('home page contrast', () => {
  it('uses a readable gray for recent and featured post dates', () => {
    render(<Home posts={posts} />)

    const dates = screen.getAllByText('March 21, 2026')
    expect(dates).toHaveLength(2)
    expect(dates.every((date) => date.classList.contains('text-gray-600'))).toBe(true)
  })
})
