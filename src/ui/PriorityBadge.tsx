import type { TicketPriority } from '@/modules/tickets/schemas'

interface PriorityBadgeProps {
  priority: TicketPriority
  className?: string
}

const colorMap: Record<TicketPriority, string> = {
  baja: 'bg-gray-100 text-gray-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
}

const labelMap: Record<TicketPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps): React.JSX.Element {
  return (
    <span
      className={[
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorMap[priority],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {labelMap[priority]}
    </span>
  )
}
