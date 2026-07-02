import type { NotificationFilter } from '../schemas'

interface NotificationFilterPillsProps {
  active: NotificationFilter
  onChange: (filter: NotificationFilter) => void
}

const FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'No leídas' },
  { value: 'status_change', label: 'Cambios de estado' },
  { value: 'sla_escalation', label: 'Escalamientos SLA' },
  { value: 'reassignment', label: 'Reasignaciones' },
  { value: 'new_comment', label: 'Comentarios nuevos' },
]

export function NotificationFilterPills({
  active,
  onChange,
}: NotificationFilterPillsProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = filter.value === active
        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(filter.value)}
            className={[
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors border',
              isActive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
