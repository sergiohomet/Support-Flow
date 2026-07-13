import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TicketCard } from '../TicketCard'
import type { TicketListItem } from '@/modules/tickets/schemas'

const SAMPLE_TICKET: TicketListItem = {
  id: 'abcdef12-beef-0000-0000-000000000000',
  title: 'Error al generar factura',
  description: 'El cliente reporta un error al generar la factura mensual.',
  status: 'abierto',
  priority: 'alta',
  categoryId: 'cat-1',
  categoryName: 'Facturación',
  clientId: 'client-1',
  clientFullName: 'Ana García',
  agentId: null,
  agentFullName: null,
  createdAt: '2026-06-15T10:00:00Z',
  updatedAt: '2026-06-15T10:00:00Z',
  commentCount: 2,
}

function renderCard(ticket: TicketListItem = SAMPLE_TICKET, onClick = vi.fn()) {
  return render(<TicketCard ticket={ticket} onClick={onClick} />)
}

describe('TicketCard', () => {
  it('renders the truncated ticket ID (first 8 chars)', () => {
    renderCard()
    expect(screen.getByText('#abcdef12')).toBeInTheDocument()
  })

  it('renders the ticket title in the card', () => {
    renderCard()
    expect(screen.getByText('Error al generar factura')).toBeInTheDocument()
  })

  it('renders the category name as a badge', () => {
    renderCard()
    expect(screen.getByText('Facturación')).toBeInTheDocument()
  })

  it('renders the status badge', () => {
    renderCard()
    expect(screen.getByText('Abierto')).toBeInTheDocument()
  })

  it('renders a "Ver detalle →" link', () => {
    renderCard()
    expect(screen.getByText('Ver detalle →')).toBeInTheDocument()
  })

  it('renders the formatted creation date', () => {
    renderCard()
    // 2026-06-15 → 15/06/2026
    expect(screen.getByText('15/06/2026')).toBeInTheDocument()
  })

  it('renders the ticket description when present', () => {
    renderCard()
    expect(
      screen.getByText('El cliente reporta un error al generar la factura mensual.')
    ).toBeInTheDocument()
  })

  it('calls onClick when the card is clicked', async () => {
    const mockClick = vi.fn()
    const user = userEvent.setup()
    renderCard(SAMPLE_TICKET, mockClick)
    await user.click(screen.getByRole('button'))
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('renders a different status badge for resolved tickets', () => {
    const resolvedTicket: TicketListItem = { ...SAMPLE_TICKET, status: 'resuelto' }
    renderCard(resolvedTicket)
    expect(screen.getByText('Resuelto')).toBeInTheDocument()
  })
})
