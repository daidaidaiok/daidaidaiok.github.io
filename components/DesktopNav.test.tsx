import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DesktopNav from './DesktopNav'

describe('DesktopNav', () => {
  it('starts at the md breakpoint so it never overlaps the mobile menu', () => {
    const { container } = render(<DesktopNav />)
    const desktopMenu = container.firstElementChild

    expect(desktopMenu).toHaveClass('md:flex')
    expect(desktopMenu).not.toHaveClass('sm:flex')
  })
})
