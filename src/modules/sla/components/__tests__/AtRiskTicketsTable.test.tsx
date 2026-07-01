import { render, screen } from '@testing-library/react'
import type { AtRiskTicket } from '@/modules/sla/schemas'
import { AtRiskTicketsTable } from '../AtRiskTicketsTable'

const makeTicket = (overrides: Partial<AtRiskTicket> = {}): AtRiskTicket => ({
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  title: 'Caída de servidor principal DB',
  categoryName: 'Redes',
  agentFullName: 'Ana Silva',
  minutesRemaining: 12,
  ...overrides,
})

describe('AtRiskTicketsTable', () => {
  it('renders truncated UUID ticket id convention, not fake TK numbering', () => {
    render(<AtRiskTicketsTable tickets={[makeTicket()]} />)

    expect(screen.getByText('#a1b2c3d4')).toBeInTheDocument()
    expect(screen.queryByText(/#TK-/i)).not.toBeInTheDocument()
  })

  it('renders title, category, and agent', () => {
    render(<AtRiskTicketsTable tickets={[makeTicket()]} />)

    expect(screen.getByText('Caída de servidor principal DB')).toBeInTheDocument()
    expect(screen.getByText('Redes')).toBeInTheDocument()
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
  })

  it('renders "Sin asignar" agent value as-is with no extra fallback logic', () => {
    render(<AtRiskTicketsTable tickets={[makeTicket({ agentFullName: 'Sin asignar' })]} />)

    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
  })

  it('formats minutesRemaining >= 60 as "Xh Ym"', () => {
    render(<AtRiskTicketsTable tickets={[makeTicket({ minutesRemaining: 105 })]} />)

    expect(screen.getByText('1h 45m')).toBeInTheDocument()
  })

  it('formats minutesRemaining < 60 as "Ym"', () => {
    render(<AtRiskTicketsTable tickets={[makeTicket({ minutesRemaining: 12 })]} />)

    expect(screen.getByText('12m')).toBeInTheDocument()
  })

  it('applies urgent/red styling when minutesRemaining < 60', () => {
    const { container } = render(<AtRiskTicketsTable tickets={[makeTicket({ minutesRemaining: 12 })]} />)

    expect(container.querySelector('.bg-red-50, .bg-error-container, .bg-red-100')).toBeTruthy()
  })

  it('applies amber styling when minutesRemaining >= 60', () => {
    const { container } = render(<AtRiskTicketsTable tickets={[makeTicket({ minutesRemaining: 105 })]} />)

    expect(container.querySelector('.bg-amber-50, .bg-amber-100')).toBeTruthy()
  })

  it('handles negative minutesRemaining (overdue) without crashing or showing a raw negative number', () => {
    render(<AtRiskTicketsTable tickets={[makeTicket({ minutesRemaining: -12 })]} />)

    expect(screen.getByText(/vencido/i)).toBeInTheDocument()
    expect(screen.queryByText('-12m')).not.toBeInTheDocument()
  })

  it('shows a positive-toned EmptyState when the at-risk list is empty', () => {
    render(<AtRiskTicketsTable tickets={[]} />)

    expect(screen.getByText(/todo bajo control/i)).toBeInTheDocument()
  })
})
