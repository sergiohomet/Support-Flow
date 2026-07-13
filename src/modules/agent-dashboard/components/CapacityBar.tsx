interface CapacityBarProps {
  current: number
  max: number
}

// Same warning-color convention as ReassignTicketModal's at-limit banner
// (amber for "near capacity", used here instead of red since this bar is a
// passive status indicator, not a blocking error state).
export function CapacityBar({ current, max }: CapacityBarProps): React.JSX.Element {
  const isNearCapacity = current >= max - 1
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Capacidad</span>
        <span className="text-xs font-semibold text-gray-700">
          {current} / {max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
          className={[
            'h-full rounded-full transition-all',
            isNearCapacity ? 'bg-amber-500' : 'bg-blue-600',
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
