import { render, screen } from '@testing-library/react'
import { UserRoleBadge } from '../UserRoleBadge'

describe('UserRoleBadge', () => {
  it('renders "Cliente" label with gray classes when role is client', () => {
    const { container } = render(<UserRoleBadge role="client" />)

    expect(screen.getByText('Cliente')).toBeInTheDocument()
    const span = container.firstChild as HTMLElement
    expect(span.className).toMatch(/bg-gray-100/)
    expect(span.className).toMatch(/text-gray-700/)
  })

  it('renders "Agente" label with blue classes when role is agent', () => {
    const { container } = render(<UserRoleBadge role="agent" />)

    expect(screen.getByText('Agente')).toBeInTheDocument()
    const span = container.firstChild as HTMLElement
    expect(span.className).toMatch(/bg-blue-100/)
    expect(span.className).toMatch(/text-blue-800/)
  })

  it('renders "Admin" label with purple classes when role is admin', () => {
    const { container } = render(<UserRoleBadge role="admin" />)

    expect(screen.getByText('Admin')).toBeInTheDocument()
    const span = container.firstChild as HTMLElement
    expect(span.className).toMatch(/bg-purple-100/)
    expect(span.className).toMatch(/text-purple-800/)
  })
})
