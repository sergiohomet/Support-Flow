interface CapacityBarProps {
  current: number
  max: number
}

// Misma convención de color de advertencia que el banner de "al límite" de
// ReassignTicketModal (ámbar para "cerca de la capacidad", usado acá en
// lugar de rojo ya que esta barra es un indicador de estado pasivo, no un
// estado de error bloqueante).
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
