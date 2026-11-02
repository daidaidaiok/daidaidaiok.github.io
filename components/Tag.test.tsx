import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Tag from './Tag'

describe('Tag contrast', () => {
  it('uses the accessible primary text shade', () => {
    render(<Tag text="claudecode" />)

    expect(screen.getByRole('link', { name: 'claudecode' })).toHaveClass('text-primary-700')
  })
})
