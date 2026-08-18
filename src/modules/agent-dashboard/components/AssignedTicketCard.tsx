import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/ui/StatusBadge'
import { TicketCardShell } from '@/ui/TicketCardShell'
import { AGENT_TRANSITIONS } from '@/modules/tickets/components/ticketTransitions'
import type { AgentDashboardTicket } from '../schemas'

interface AssignedTicketCardProps {
  ticket: AgentDashboardTicket
  currentUserId: string | null
  isResolving: boolean
  isReturning: boolean
  onResolve: () => void
  onReturnToPool: () => void
}

// No hay un timestamp dedicado "assigned_at" en la fila de get_tickets —
// updatedAt es el proxy disponible más cercano (assign_ticket toca
// updated_at), así que "hace X" es relativo a la última actualización, no
// al momento exacto de la asignación (claim). Marcado como una desviación
// en el apply report.
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
  currentUserId,
  isResolving,
  isReturning,
  onResolve,
  onReturnToPool,
}: AssignedTicketCardProps): React.JSX.Element {
  const canResolve = AGENT_TRANSITIONS[ticket.status].includes('resuelto')
  const canReturnToPool =
    ticket.agentId === currentUserId &&
    ticket.agentId !== null &&
    ticket.status !== 'resuelto'
  const navigate = useNavigate()

  // La navegación vive localmente en este componente hoja (en lugar de
  // elevarse a una prop pasada a través de AgentDashboardPage, como hacen
  // TicketCard/TicketListPage) porque AgentDashboardPage no tiene un
  // cableado de enrutamiento por click existente para esta card y agregar
  // uno acá es más simple. Marcado como una desviación.
  const handleNavigate = (): void => {
    navigate(`/tickets/${ticket.id}`)
  }

  const handleReturnToPoolClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation()
    onReturnToPool()
  }

  const handleResolveClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation()
    onResolve()
  }

  return (
    <TicketCardShell
      id={ticket.id}
      title={ticket.title}
      description={ticket.description}
      onClick={handleNavigate}
      badges={<StatusBadge status={ticket.status} />}
      meta={<span className="text-xs text-gray-400">{formatRelativeTime(ticket.updatedAt)}</span>}
    >
      {canReturnToPool && (
        <button
          type="button"
          onClick={handleReturnToPoolClick}
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
      )}

      {canResolve && (
        <button
          type="button"
          onClick={handleResolveClick}
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
    </TicketCardShell>
  )
}
