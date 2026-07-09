import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportsDateRangeFilter, computeReportsDateRange } from '../ReportsDateRangeFilter'

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

describe('computeReportsDateRange', () => {
  it('returns full ISO timestamps, not date-only strings, for every preset', () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    const presets = ['last30', 'thisMonth', 'lastMonth', 'thisQuarter'] as const

    for (const preset of presets) {
      const { dateFrom, dateTo } = computeReportsDateRange(preset)
      expect(dateFrom).toMatch(isoRegex)
      expect(dateTo).toMatch(isoRegex)
    }
  })

  it('computes last30 as exactly 30 days back from now', () => {
    const { dateFrom, dateTo } = computeReportsDateRange('last30')
    const diffDays = (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(30, 1)
  })

  it('computes thisMonth as the 1st of the current month through now', () => {
    const now = new Date()
    const { dateFrom, dateTo } = computeReportsDateRange('thisMonth')
    const from = new Date(dateFrom)

    expect(from.getFullYear()).toBe(now.getFullYear())
    expect(from.getMonth()).toBe(now.getMonth())
    expect(from.getDate()).toBe(1)
    expect(new Date(dateTo).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('computes lastMonth as the full previous calendar month', () => {
    const now = new Date()
    const { dateFrom, dateTo } = computeReportsDateRange('lastMonth')
    const from = new Date(dateFrom)
    const to = new Date(dateTo)

    const expectedMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const expectedYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

    expect(from.getFullYear()).toBe(expectedYear)
    expect(from.getMonth()).toBe(expectedMonth)
    expect(from.getDate()).toBe(1)

    // `to` must fall on the last day of that same previous month.
    expect(to.getFullYear()).toBe(expectedYear)
    expect(to.getMonth()).toBe(expectedMonth)
    const lastDayOfMonth = new Date(expectedYear, expectedMonth + 1, 0).getDate()
    expect(to.getDate()).toBe(lastDayOfMonth)
  })

  it('computes thisQuarter as the 1st day of the current calendar quarter through now', () => {
    const now = new Date()
    const { dateFrom, dateTo } = computeReportsDateRange('thisQuarter')
    const from = new Date(dateFrom)
    const expectedQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3

    expect(from.getFullYear()).toBe(now.getFullYear())
    expect(from.getMonth()).toBe(expectedQuarterStartMonth)
    expect(from.getDate()).toBe(1)
    expect(new Date(dateTo).getTime()).toBeLessThanOrEqual(Date.now())
  })
})
