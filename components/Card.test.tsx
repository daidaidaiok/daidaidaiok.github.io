import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Card from './Card'

describe('Card accessible link', () => {
  it('keeps the visible Learn more label in the link accessible name', () => {
    render(
      <Card
        title="Accessible project"
        description="A project description."
        imgSrc={undefined}
        href="https://example.test/project"
      />
    )

    const moreLink = screen.getByRole('link', { name: /learn more/i })
    expect(moreLink).toHaveAccessibleName('Learn more: Accessible project')
    expect(moreLink).toHaveClass('text-primary-700', 'dark:text-primary-400')
  })
})
