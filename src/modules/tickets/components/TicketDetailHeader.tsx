import type { TicketDetail } from '@/modules/tickets/schemas'
import { StatusBadge } from '@/ui/StatusBadge'
import { PriorityBadge } from '@/ui/PriorityBadge'

interface TicketDetailHeaderProps {
  ticket: TicketDetail
  onBack: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TicketDetailHeader({ ticket, onBack }: TicketDetailHeaderProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 pb-4 border-b border-gray-200">
      {/* Row 1: back + title */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-0.5"
          aria-label="Volver"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Volver
        </button>
        <h1 className="text-xl font-semibold text-gray-900 leading-tight">{ticket.title}</h1>
      </div>

      {/* Row 2: status + priority + category + client */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <span className="text-gray-300">·</span>
        <span>{ticket.categoryName}</span>
        <span className="text-gray-300">·</span>
        <span>Cliente: <span className="font-medium text-gray-700">{ticket.clientFullName}</span></span>
      </div>

      {/* Row 3: agent + dates */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>
          Asignado a:{' '}
          <span className="font-medium text-gray-700">
            {ticket.agentFullName ?? 'Sin asignar'}
          </span>
        </span>
        <span>Creado: {formatDate(ticket.createdAt)}</span>
        <span>Actualizado: {formatDate(ticket.updatedAt)}</span>
      </div>
    </div>
  )
}
