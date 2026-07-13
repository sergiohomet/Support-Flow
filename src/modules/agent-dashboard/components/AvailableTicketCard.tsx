import { getCompactSlaStatus } from './slaCountdown'
import type { AgentDashboardTicket } from '../schemas'

interface AvailableTicketCardProps {
  ticket: AgentDashboardTicket
  disabled: boolean
  isClaiming: boolean
  onClaim: () => void
}

const priorityColorMap: Record<AgentDashboardTicket['priority'], string> = {
  baja: 'bg-gray-100 text-gray-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
}

const priorityLabelMap: Record<AgentDashboardTicket['priority'], string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

const slaToneClassMap: Record<'normal' | 'warning' | 'danger', string> = {
  normal: 'text-blue-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
}

// `disabled` is a PARENT-decided warning flag (agent is near/at capacity),
// NOT a hard-disable of the claim button — per the resolved design decision
// mirrored from ReassignTicketModal's at-limit UX: warn, don't block. The
// server-side validate_agent_limit trigger is the real enforcement.
export function AvailableTicketCard({
  ticket,
  disabled,
  isClaiming,
  onClaim,
}: AvailableTicketCardProps): React.JSX.Element {
  const slaStatus = getCompactSlaStatus({
    escalatedAt: ticket.escalatedAt,
    slaHours: ticket.slaHours,
    createdAt: ticket.createdAt,
  })

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-gray-400">#{ticket.id.slice(0, 8)}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {ticket.categoryName}
          </span>
          <span
            className={[
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              priorityColorMap[ticket.priority],
            ].join(' ')}
          >
            {priorityLabelMap[ticket.priority]}
          </span>
        </div>
      </div>

      <p className="text-blue-700 font-medium leading-snug">{ticket.title}</p>

      <div className="flex items-center justify-between mt-auto pt-1">
        <span
          className={['inline-flex items-center gap-1 text-xs font-medium', slaToneClassMap[slaStatus.tone]].join(
            ' '
          )}
        >
          <span className="material-icons text-[14px]">{slaStatus.icon}</span>
          {slaStatus.label}
        </span>

        <button
          type="button"
          onClick={onClaim}
          disabled={isClaiming}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isClaiming && (
            <span className="material-icons text-[14px] animate-spin" aria-hidden="true">
              refresh
            </span>
          )}
          Tomar Ticket
        </button>
      </div>

      {disabled && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-1">
          Estás cerca del límite de capacidad. Podés tomar este ticket, pero revisá tu carga actual.
        </p>
      )}
    </div>
  )
}
