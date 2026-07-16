import { computeSlaDateRange } from '../dateRange'

describe('computeSlaDateRange', () => {
  it('returns full ISO timestamps, not date-only strings', () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    const { dateFrom, dateTo } = computeSlaDateRange(7)
    expect(dateFrom).toMatch(isoRegex)
    expect(dateTo).toMatch(isoRegex)
  })

  it('computes dateFrom as exactly `days` days back from now', () => {
    const { dateFrom, dateTo } = computeSlaDateRange(7)
    const diffDays = (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(7, 1)
  })

  it('computes dateTo as now (not date-only, no truncation)', () => {
    const { dateTo } = computeSlaDateRange(7)
    expect(new Date(dateTo).getTime()).toBeLessThanOrEqual(Date.now())
    expect(new Date(dateTo).getTime()).toBeGreaterThan(Date.now() - 1000)
  })

  it('supports different day windows (e.g. 30 days)', () => {
    const { dateFrom, dateTo } = computeSlaDateRange(30)
    const diffDays = (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(30, 1)
  })
})
