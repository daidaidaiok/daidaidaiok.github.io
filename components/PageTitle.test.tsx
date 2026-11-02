import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PageTitle from './PageTitle'

describe('PageTitle', () => {
  it('renders its text as a level-one heading', () => {
    render(<PageTitle>关于本站</PageTitle>)

    expect(screen.getByRole('heading', { level: 1, name: '关于本站' })).toBeInTheDocument()
  })
})
