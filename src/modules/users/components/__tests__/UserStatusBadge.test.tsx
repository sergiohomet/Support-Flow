import { render, screen } from '@testing-library/react'
import { UserStatusBadge } from '../UserStatusBadge'

describe('UserStatusBadge', () => {
  it('renders "Active" with green classes when isActive is true', () => {
    const { container } = render(<UserStatusBadge isActive={true} />)

    expect(screen.getByText('Active')).toBeInTheDocument()
    const span = container.firstChild as HTMLElement
    expect(span.className).toMatch(/bg-green-100/)
    expect(span.className).toMatch(/text-green-800/)
  })

  it('renders "Inactive" with gray classes when isActive is false', () => {
    const { container } = render(<UserStatusBadge isActive={false} />)

    expect(screen.getByText('Inactive')).toBeInTheDocument()
    const span = container.firstChild as HTMLElement
    expect(span.className).toMatch(/bg-gray-100/)
    expect(span.className).toMatch(/text-gray-500/)
  })
})
