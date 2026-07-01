import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateRangeFilter } from '../DateRangeFilter'

describe('DateRangeFilter', () => {
  it('renders a select with the three day-range options', () => {
    render(<DateRangeFilter value={7} onChange={vi.fn()} />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /últimos 7 días/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /últimos 15 días/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /últimos 30 días/i })).toBeInTheDocument()
  })

  it('reflects the current value as selected', () => {
    render(<DateRangeFilter value={15} onChange={vi.fn()} />)

    expect(screen.getByRole('combobox')).toHaveValue('15')
  })

  it('calls onChange with the selected number of days', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateRangeFilter value={7} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox'), '30')

    expect(onChange).toHaveBeenCalledWith(30)
  })
})
