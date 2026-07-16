import type { TicketListItem } from '@/modules/tickets/schemas'
import { StatusBadge } from '@/ui/StatusBadge'
import { TicketCardShell } from '@/ui/TicketCardShell'
import { formatDateOnly } from '@/core/utils/format'

interface TicketCardProps {
  ticket: TicketListItem
  onClick: () => void
}

export function TicketCard({ ticket, onClick }: TicketCardProps): React.JSX.Element {
  return (
    <TicketCardShell
      id={ticket.id}
      title={ticket.title}
      description={ticket.description}
      onClick={onClick}
      badges={
        <>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {ticket.categoryName}
          </span>
          <StatusBadge status={ticket.status} />
        </>
      }
      meta={<span className="text-xs text-gray-400">{formatDateOnly(ticket.createdAt)}</span>}
    />
  )
}
