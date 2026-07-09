export type ReportsRangePreset = 'last30' | 'thisMonth' | 'lastMonth' | 'thisQuarter'

// Calendar-aware date range calculation, kept pure so the caller (ReportsPage)
// can memoize it with useMemo — recomputing on every render would produce a
// new millisecond-precision "now" each time and re-trigger fetch effects.
// Always returns full ISO timestamps, never date-only strings: a date-only
// "dateTo" is parsed by Postgres as midnight UTC, silently excluding
// same-day data from the BETWEEN filter in the reports RPCs.
export function computeReportsDateRange(preset: ReportsRangePreset): { dateFrom: string; dateTo: string } {
  const now = new Date()

  switch (preset) {
    case 'last30': {
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
    }
    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
    }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      // Day 0 of the current month is the last day of the previous month.
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
    }
    case 'thisQuarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
      const from = new Date(now.getFullYear(), quarterStartMonth, 1)
      return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
    }
  }
}
