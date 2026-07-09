import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportsDateRangeFilter } from '../ReportsDateRangeFilter'

describe('ReportsDateRangeFilter', () => {
  it('renders the four preset options with the exact Spanish labels', () => {
    render(<ReportsDateRangeFilter value="last30" onChange={vi.fn()} />)

    expect(screen.getByRole('option', { name: 'Últimos 30 días' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Este Mes' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mes Anterior' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Este Trimestre' })).toBeInTheDocument()
  })

  it('reflects the current value as selected', () => {
    render(<ReportsDateRangeFilter value="thisMonth" onChange={vi.fn()} />)

    expect(screen.getByRole('combobox')).toHaveValue('thisMonth')
  })

  it('calls onChange with the selected preset', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ReportsDateRangeFilter value="last30" onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox'), 'lastMonth')

    expect(onChange).toHaveBeenCalledWith('lastMonth')
  })
})
