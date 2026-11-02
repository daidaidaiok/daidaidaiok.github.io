import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import WechatQrcode from './WechatQrcode'

describe('WechatQrcode controls', () => {
  it('shows a pointer cursor on the open button', () => {
    render(<WechatQrcode />)

    expect(screen.getByRole('button', { name: '微信公众号二维码' })).toHaveClass('cursor-pointer')
  })

  it('shows a pointer cursor on close and dismisses the dialog', () => {
    render(<WechatQrcode />)
    fireEvent.click(screen.getByRole('button', { name: '微信公众号二维码' }))

    const dialog = screen.getByRole('dialog')
    const closeButton = within(dialog).getByRole('button', { name: '关闭' })

    expect(closeButton).toHaveClass('cursor-pointer')
    fireEvent.click(closeButton)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
