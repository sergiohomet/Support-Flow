import type { ReportsRangePreset } from './dateRange'

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
