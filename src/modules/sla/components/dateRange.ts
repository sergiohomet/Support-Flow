export function computeDateRange(days: number): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - days)
  // Send full timestamps, not date-only strings — a date-only "dateTo" is
  // parsed by Postgres as midnight UTC, which excludes everything created
  // later today from the BETWEEN filter in the SLA RPCs.
  return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
}
