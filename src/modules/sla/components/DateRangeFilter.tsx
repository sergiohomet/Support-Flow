interface DateRangeFilterProps {
  value: number
  onChange: (days: number) => void
}

const OPTIONS = [
  { days: 7, label: 'Últimos 7 días' },
  { days: 15, label: 'Últimos 15 días' },
  { days: 30, label: 'Últimos 30 días' },
]

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps): React.JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Rango de fechas"
      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
    >
      {OPTIONS.map((option) => (
        <option key={option.days} value={option.days}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
