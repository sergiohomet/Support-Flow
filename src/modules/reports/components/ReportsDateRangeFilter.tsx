export type ReportsRangePreset = 'last30' | 'thisMonth' | 'lastMonth' | 'thisQuarter'

interface ReportsDateRangeFilterProps {
  value: ReportsRangePreset
  onChange: (preset: ReportsRangePreset) => void
}

const OPTIONS: Array<{ preset: ReportsRangePreset; label: string }> = [
  { preset: 'last30', label: 'Últimos 30 días' },
  { preset: 'thisMonth', label: 'Este Mes' },
  { preset: 'lastMonth', label: 'Mes Anterior' },
  { preset: 'thisQuarter', label: 'Este Trimestre' },
]

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

export function ReportsDateRangeFilter({ value, onChange }: ReportsDateRangeFilterProps): React.JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ReportsRangePreset)}
      aria-label="Rango de fechas"
      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
    >
      {OPTIONS.map((option) => (
        <option key={option.preset} value={option.preset}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
