import { render, screen } from '@testing-library/react'
import type { TicketsByWeek } from '@/modules/reports/schemas'
import { TicketsByWeekChart } from '../TicketsByWeekChart'

const makeRow = (overrides: Partial<TicketsByWeek> = {}): TicketsByWeek => ({
  weekStart: '2026-06-01',
  ticketCount: 10,
  ...overrides,
})

describe('TicketsByWeekChart', () => {
  it('renders one bar per data point', () => {
    const data = [
      makeRow({ weekStart: '2026-06-01', ticketCount: 5 }),
      makeRow({ weekStart: '2026-06-08', ticketCount: 15 }),
      makeRow({ weekStart: '2026-06-15', ticketCount: 8 }),
    ]
    render(<TicketsByWeekChart data={data} />)

    expect(screen.getAllByRole('img')).toHaveLength(3)
  })

  it('shows an empty state when data is empty', () => {
    render(<TicketsByWeekChart data={[]} />)

    expect(screen.getByText(/sin datos/i)).toBeInTheDocument()
  })

  it('does not divide by zero with a single data point (max = that value)', () => {
    render(<TicketsByWeekChart data={[makeRow({ ticketCount: 7 })]} />)

    const bar = screen.getByRole('img')
    expect(bar).toHaveStyle({ height: '100%' })
    expect(bar.getAttribute('style')).not.toMatch(/nan/i)
  })
})
