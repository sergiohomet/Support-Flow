import type { TicketListItem as TicketListItemType } from '@/modules/tickets/schemas'
import { StatusBadge } from '@/ui/StatusBadge'
import { PriorityBadge } from '@/ui/PriorityBadge'

interface TicketListItemProps {
  ticket: TicketListItemType
  onClick: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TicketListItem({ ticket, onClick }: TicketListItemProps): React.JSX.Element {
  return (
    <li className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer text-left transition-colors"
      >
        {/* Left: title + category */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{ticket.title}</p>
          <p className="text-sm text-gray-500 truncate">{ticket.categoryName}</p>
        </div>

        {/* Middle: badges */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.commentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.58-3.58A26.459 26.459 0 0010 14c2.236 0 4.43-.18 6.57-.524 1.437-.232 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.102 41.102 0 0010 2z"
                  clipRule="evenodd"
                />
              </svg>
              {ticket.commentCount}
            </span>
          )}
        </div>

        {/* Right: agent + date */}
        <div className="flex flex-col items-end shrink-0 min-w-[120px]">
          <span className="text-sm text-gray-400">
            {ticket.agentFullName ?? 'Sin asignar'}
          </span>
          <span className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</span>
        </div>
      </button>
    </li>
  )
}
