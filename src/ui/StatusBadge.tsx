import type { TicketStatus } from '@/modules/tickets/schemas'

interface StatusBadgeProps {
  status: TicketStatus
  className?: string
}

const colorMap: Record<TicketStatus, string> = {
  abierto: 'bg-blue-100 text-blue-800',
  en_proceso: 'bg-amber-100 text-amber-800',
  resuelto: 'bg-green-100 text-green-800',
  reabierto: 'bg-purple-100 text-purple-800',
}

const labelMap: Record<TicketStatus, string> = {
  abierto: 'Abierto',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  reabierto: 'Reabierto',
}

export function StatusBadge({ status, className }: StatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={[
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorMap[status],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {labelMap[status]}
    </span>
  )
}
