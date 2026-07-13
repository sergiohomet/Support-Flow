import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssignedTicketCard } from '../AssignedTicketCard'
import type { AgentDashboardTicket } from '../../schemas'

const SAMPLE_TICKET: AgentDashboardTicket = {
  id: 'abcdef12-beef-0000-0000-000000000000',
  title: 'Factura duplicada',
  description: 'El cliente reporta un cobro duplicado en su última factura.',
  status: 'abierto',
  priority: 'media',
  categoryId: 'cat-2',
  categoryName: 'Facturación',
  agentId: 'agent-1',
  agentFullName: 'Ana García',
  createdAt: '2026-07-12T00:00:00Z',
  updatedAt: '2026-07-12T00:00:00Z',
  escalatedAt: null,
  slaHours: 24,
  commentCount: 3,
}

function renderCard(props: Partial<React.ComponentProps<typeof AssignedTicketCard>> = {}) {
  return render(
    <AssignedTicketCard
      ticket={SAMPLE_TICKET}
      isResolving={false}
      isReturning={false}
      onResolve={vi.fn()}
      onReturnToPool={vi.fn()}
      {...props}
    />
  )
}

describe('AssignedTicketCard', () => {
  it('renders the ticket title', () => {
    renderCard()
    expect(screen.getByText('Factura duplicada')).toBeInTheDocument()
  })

  it('renders the status badge', () => {
    renderCard()
    expect(screen.getByText('Abierto')).toBeInTheDocument()
  })

  it('renders a "Devolver al pool" button regardless of status', () => {
    renderCard({ ticket: { ...SAMPLE_TICKET, status: 'resuelto' } })
    expect(screen.getByRole('button', { name: /devolver al pool/i })).toBeInTheDocument()
  })

  it('renders a "Resolver" button when resuelto is a valid transition for the current status', () => {
    renderCard()
    expect(screen.getByRole('button', { name: /^resolver$/i })).toBeInTheDocument()
  })

  it('does NOT render a "Resolver" button when the ticket is already resuelto', () => {
    renderCard({ ticket: { ...SAMPLE_TICKET, status: 'resuelto' } })
    expect(screen.queryByRole('button', { name: /^resolver$/i })).not.toBeInTheDocument()
  })

  it('calls onResolve when the Resolver button is clicked', async () => {
    const onResolve = vi.fn()
    const user = userEvent.setup()
    renderCard({ onResolve })
    await user.click(screen.getByRole('button', { name: /^resolver$/i }))
    expect(onResolve).toHaveBeenCalledTimes(1)
  })

  it('calls onReturnToPool when the Devolver al pool button is clicked', async () => {
    const onReturnToPool = vi.fn()
    const user = userEvent.setup()
    renderCard({ onReturnToPool })
    await user.click(screen.getByRole('button', { name: /devolver al pool/i }))
    expect(onReturnToPool).toHaveBeenCalledTimes(1)
  })

  it('disables the Resolver button while isResolving is true', () => {
    renderCard({ isResolving: true })
    expect(screen.getByRole('button', { name: /^resolver$/i })).toBeDisabled()
  })

  it('disables the Devolver al pool button while isReturning is true', () => {
    renderCard({ isReturning: true })
    expect(screen.getByRole('button', { name: /devolver al pool/i })).toBeDisabled()
  })

  it('renders a relative "hace" time based on the last update', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T02:00:00Z'))

    renderCard()
    // 2h since updatedAt (2026-07-12T00:00:00Z), system time 02:00:00Z
    expect(screen.getByText(/hace 2 horas/i)).toBeInTheDocument()

    vi.useRealTimers()
  })
})
