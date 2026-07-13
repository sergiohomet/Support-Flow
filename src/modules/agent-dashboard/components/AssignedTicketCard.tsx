import { StatusBadge } from '@/ui/StatusBadge'
import { AGENT_TRANSITIONS } from '@/modules/tickets/components/ticketTransitions'
import type { AgentDashboardTicket } from '../schemas'

interface AssignedTicketCardProps {
  ticket: AgentDashboardTicket
  isResolving: boolean
  isReturning: boolean
  onResolve: () => void
  onReturnToPool: () => void
}

// There is no dedicated "assigned_at" timestamp on the get_tickets row —
// updatedAt is the closest available proxy (assign_ticket touches
// updated_at), so "hace X" is relative to the last update, not the exact
// claim moment. Flagged as a deviation in the apply report.
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'hace instantes'
  if (diffMinutes < 60) return `hace ${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`

  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`
}

export function AssignedTicketCard({
  ticket,
  isResolving,
  isReturning,
  onResolve,
  onReturnToPool,
}: AssignedTicketCardProps): React.JSX.Element {
  const canResolve = AGENT_TRANSITIONS[ticket.status].includes('resuelto')

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-gray-400">#{ticket.id.slice(0, 8)}</span>
        <StatusBadge status={ticket.status} />
      </div>

      <p className="text-blue-700 font-medium leading-snug">{ticket.title}</p>

      <span className="text-xs text-gray-400">{formatRelativeTime(ticket.updatedAt)}</span>

      <div className="flex items-center justify-end gap-2 mt-auto pt-1">
        <button
          type="button"
          onClick={onReturnToPool}
          disabled={isReturning}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReturning && (
            <span className="material-icons text-[14px] animate-spin" aria-hidden="true">
              refresh
            </span>
          )}
          Devolver al pool
        </button>

        {canResolve && (
          <button
            type="button"
            onClick={onResolve}
            disabled={isResolving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResolving && (
              <span className="material-icons text-[14px] animate-spin" aria-hidden="true">
                refresh
              </span>
            )}
            Resolver
          </button>
        )}
      </div>
    </div>
  )
}
