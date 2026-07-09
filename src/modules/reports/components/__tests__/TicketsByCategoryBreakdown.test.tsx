import { render, screen } from '@testing-library/react'
import type { TicketsByCategory } from '@/modules/reports/schemas'
import { TicketsByCategoryBreakdown } from '../TicketsByCategoryBreakdown'

const makeRow = (overrides: Partial<TicketsByCategory> = {}): TicketsByCategory => ({
  categoryId: 'cat-1',
  categoryName: 'Software',
  ticketCount: 42,
  ...overrides,
})

describe('TicketsByCategoryBreakdown', () => {
  it('renders category name and count for each row', () => {
    const data = [
      makeRow({ categoryId: 'cat-1', categoryName: 'Software', ticketCount: 42 }),
      makeRow({ categoryId: 'cat-2', categoryName: 'Hardware', ticketCount: 28 }),
    ]
    render(<TicketsByCategoryBreakdown data={data} />)

    expect(screen.getByText('Software')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('28')).toBeInTheDocument()
  })

  it('renders a ticketCount: 0 row without error (RPC zero-fill behavior)', () => {
    render(<TicketsByCategoryBreakdown data={[makeRow({ ticketCount: 0 })]} />)

    expect(screen.getByText('Software')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows an empty state when data is empty', () => {
    render(<TicketsByCategoryBreakdown data={[]} />)

    expect(screen.getByText(/sin datos/i)).toBeInTheDocument()
  })
})
