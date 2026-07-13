import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvailableTicketCard } from '../AvailableTicketCard'
import type { AgentDashboardTicket } from '../../schemas'

const SAMPLE_TICKET: AgentDashboardTicket = {
  id: 'abcdef12-beef-0000-0000-000000000000',
  title: 'No puedo acceder a mi cuenta',
  status: 'abierto',
  priority: 'alta',
  categoryId: 'cat-1',
  categoryName: 'Accesos',
  agentId: null,
  agentFullName: null,
  createdAt: '2026-07-12T00:00:00Z',
  updatedAt: '2026-07-12T00:00:00Z',
  escalatedAt: null,
  slaHours: null,
  commentCount: 0,
}

function renderCard(props: Partial<React.ComponentProps<typeof AvailableTicketCard>> = {}) {
  return render(
    <AvailableTicketCard
      ticket={SAMPLE_TICKET}
      disabled={false}
      isClaiming={false}
      onClaim={vi.fn()}
      {...props}
    />
  )
}

describe('AvailableTicketCard', () => {
  it('renders the ticket title', () => {
    renderCard()
    expect(screen.getByText('No puedo acceder a mi cuenta')).toBeInTheDocument()
  })

  it('renders the category badge', () => {
    renderCard()
    expect(screen.getByText('Accesos')).toBeInTheDocument()
  })

  it('renders the priority badge', () => {
    renderCard()
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('renders the SLA countdown label', () => {
    renderCard()
    expect(screen.getByText('Sin SLA')).toBeInTheDocument()
  })

  it('renders a "Tomar Ticket" button', () => {
    renderCard()
    expect(screen.getByRole('button', { name: /tomar ticket/i })).toBeInTheDocument()
  })

  it('calls onClaim when the claim button is clicked', async () => {
    const onClaim = vi.fn()
    const user = userEvent.setup()
    renderCard({ onClaim })
    await user.click(screen.getByRole('button', { name: /tomar ticket/i }))
    expect(onClaim).toHaveBeenCalledTimes(1)
  })

  it('shows a loading state on the claim button when isClaiming is true', () => {
    renderCard({ isClaiming: true })
    expect(screen.getByRole('button', { name: /tomar ticket/i })).toBeDisabled()
  })

  it('does NOT hard-disable the claim button when disabled (near-capacity) — warns instead', () => {
    renderCard({ disabled: true })
    // Per resolved design decision: warn, don't hard-disable (server enforces the real limit)
    expect(screen.getByRole('button', { name: /tomar ticket/i })).not.toBeDisabled()
  })

  it('shows a capacity warning message when disabled is true', () => {
    renderCard({ disabled: true })
    expect(screen.getByText(/cerca del límite de capacidad/i)).toBeInTheDocument()
  })

  it('does not show the capacity warning message when disabled is false', () => {
    renderCard({ disabled: false })
    expect(screen.queryByText(/cerca del límite de capacidad/i)).not.toBeInTheDocument()
  })
})
