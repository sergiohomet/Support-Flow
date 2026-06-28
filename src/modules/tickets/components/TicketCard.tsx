import type { TicketListItem } from '@/modules/tickets/schemas'
import { StatusBadge } from '@/ui/StatusBadge'

interface TicketCardProps {
  ticket: TicketListItem
  onClick: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TicketCard({ ticket, onClick }: TicketCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-gray-400">#{ticket.id.slice(0, 8)}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {ticket.categoryName}
          </span>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <p className="text-blue-700 font-medium leading-snug">{ticket.title}</p>

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</span>
        <span className="text-xs text-blue-600 font-medium">Ver detalle →</span>
      </div>
    </button>
  )
}
