// Days-based date range calculation, kept pure so the caller (SlaDashboardPage)
// can memoize it with useMemo — recomputing on every render would produce a
// new millisecond-precision "now" each time and re-trigger fetch effects.
// Always returns full ISO timestamps, never date-only strings: a date-only
// "dateTo" is parsed by Postgres as midnight UTC, silently excluding
// same-day data from the BETWEEN filter in the SLA RPCs.
export function computeSlaDateRange(days: number): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - days)
  return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
}
