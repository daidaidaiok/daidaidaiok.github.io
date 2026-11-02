import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ListLayoutWithTags from './ListLayoutWithTags'

vi.mock('next/navigation', () => ({ usePathname: () => '/blog/' }))

const posts = [
  {
    id: 'post-1',
    path: 'blog/post-1.mdx',
    slug: 'post-1',
    date: '2026-03-21',
    title: 'Example post',
    summary: 'A test summary.',
    tags: [],
  },
] as never[]

describe('blog list contrast', () => {
  it('uses accessible colors for the section label and post date', () => {
    render(<ListLayoutWithTags posts={posts} title="博客" />)

    expect(screen.getByRole('heading', { name: '全部文章' })).toHaveClass(
      'text-primary-700',
      'dark:text-primary-400'
    )
    expect(screen.getByText('March 21, 2026').closest('dd')).toHaveClass('text-gray-600')
  })
})
