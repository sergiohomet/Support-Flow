import type { TicketListItem } from '@/modules/tickets/schemas'
import { filterVisibleTickets } from '../filterVisibleTickets'

const makeTicket = (overrides: Partial<TicketListItem> = {}): TicketListItem => ({
  id: 'abcdef12-0000-0000-0000-000000000000',
  title: 'Mi primer ticket',
  description: '',
  status: 'abierto',
  priority: 'media',
  categoryId: 'cat-1',
  categoryName: 'Soporte',
  categoryIsActive: true,
  clientId: 'user-1',
  clientFullName: 'Juan Pérez',
  agentId: null,
  agentFullName: null,
  createdAt: '2026-06-15T10:00:00Z',
  updatedAt: '2026-06-15T10:00:00Z',
  commentCount: 0,
  ...overrides,
})

describe('filterVisibleTickets', () => {
  it('returns all tickets when the search term is empty', () => {
    const tickets = [makeTicket(), makeTicket({ id: 'other-id', title: 'Factura pendiente' })]
    expect(filterVisibleTickets(tickets, '')).toEqual(tickets)
  })

  it('returns all tickets when the search term is only whitespace', () => {
    const tickets = [makeTicket()]
    expect(filterVisibleTickets(tickets, '   ')).toEqual(tickets)
  })

  it('matches tickets by case-insensitive title substring', () => {
    const tickets = [makeTicket({ title: 'Factura pendiente' }), makeTicket({ id: 'x', title: 'Otro asunto' })]
    expect(filterVisibleTickets(tickets, 'FACTURA')).toEqual([tickets[0]])
  })

  it('matches tickets by the first 8 characters of the id', () => {
    const tickets = [
      makeTicket({ id: 'abcdef12-0000-0000-0000-000000000000', title: 'A' }),
      makeTicket({ id: 'ffffffff-0000-0000-0000-000000000000', title: 'B' }),
    ]
    expect(filterVisibleTickets(tickets, 'abcdef12')).toEqual([tickets[0]])
  })

  it('strips a leading "#" from the search term before matching the id', () => {
    const tickets = [makeTicket({ id: 'abcdef12-0000-0000-0000-000000000000', title: 'A' })]
    expect(filterVisibleTickets(tickets, '#abcdef12')).toEqual(tickets)
  })

  it('returns an empty array when nothing matches', () => {
    const tickets = [makeTicket({ title: 'Factura pendiente' })]
    expect(filterVisibleTickets(tickets, 'no-match')).toEqual([])
  })
})
