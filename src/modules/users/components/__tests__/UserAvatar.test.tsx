import { render, screen } from '@testing-library/react'
import { UserAvatar } from '../UserAvatar'

describe('UserAvatar', () => {
  describe('with avatarUrl', () => {
    it('renders an img with correct src and alt', () => {
      render(<UserAvatar avatarUrl="https://example.com/avatar.jpg" fullName="Juan Perez" />)

      const img = screen.getByRole('img', { name: 'Juan Perez' })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    })
  })

  describe('without avatarUrl', () => {
    it('renders initials instead of an img when avatarUrl is null', () => {
      render(<UserAvatar avatarUrl={null} fullName="Juan Perez" />)

      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(screen.getByText('JP')).toBeInTheDocument()
    })

    it('derives initials correctly from a single name', () => {
      render(<UserAvatar avatarUrl={null} fullName="Ana" />)

      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('derives initials correctly from a multi-word name', () => {
      render(<UserAvatar avatarUrl={null} fullName="Juan Perez" />)

      expect(screen.getByText('JP')).toBeInTheDocument()
    })
  })

  describe('size variants', () => {
    it('applies sm size classes when size is sm', () => {
      const { container } = render(
        <UserAvatar avatarUrl={null} fullName="Test User" size="sm" />,
      )
      const circle = container.firstChild as HTMLElement
      expect(circle.className).toMatch(/w-8/)
      expect(circle.className).toMatch(/h-8/)
    })

    it('applies md size classes when size is md', () => {
      const { container } = render(
        <UserAvatar avatarUrl={null} fullName="Test User" size="md" />,
      )
      const circle = container.firstChild as HTMLElement
      expect(circle.className).toMatch(/w-10/)
      expect(circle.className).toMatch(/h-10/)
    })

    it('defaults to md size when size prop is omitted', () => {
      const { container } = render(<UserAvatar avatarUrl={null} fullName="Test User" />)
      const circle = container.firstChild as HTMLElement
      expect(circle.className).toMatch(/w-10/)
      expect(circle.className).toMatch(/h-10/)
    })

    it('sm size is visually smaller than md size (different classes)', () => {
      const { container: smContainer } = render(
        <UserAvatar avatarUrl={null} fullName="Test User" size="sm" />,
      )
      const { container: mdContainer } = render(
        <UserAvatar avatarUrl={null} fullName="Test User" size="md" />,
      )

      const smClass = (smContainer.firstChild as HTMLElement).className
      const mdClass = (mdContainer.firstChild as HTMLElement).className

      expect(smClass).not.toEqual(mdClass)
      expect(smClass).toMatch(/w-8/)
      expect(mdClass).toMatch(/w-10/)
    })
  })
})
