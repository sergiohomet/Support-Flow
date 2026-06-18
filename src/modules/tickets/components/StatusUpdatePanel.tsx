import type { TicketStatus } from '@/modules/tickets/schemas'
import type { UserRole } from '@/store/authSlice'

interface StatusUpdatePanelProps {
  currentStatus: TicketStatus
  userRole: UserRole
  onUpdate: (newStatus: TicketStatus) => void
  isLoading: boolean
  error: string | null
}

const transitionLabel: Record<TicketStatus, string> = {
  en_proceso: 'Marcar en proceso',
  resuelto: 'Marcar resuelto',
  abierto: 'Marcar abierto',
  reabierto: 'Reabrir ticket',
}

const AGENT_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  abierto: ['en_proceso', 'resuelto'],
  en_proceso: ['resuelto', 'abierto'],
  resuelto: ['reabierto'],
  reabierto: ['en_proceso', 'resuelto'],
}

const CLIENT_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  abierto: [],
  en_proceso: [],
  resuelto: ['reabierto'],
  reabierto: [],
}

function getAllowedTransitions(
  currentStatus: TicketStatus,
  userRole: UserRole,
): TicketStatus[] {
  if (userRole === 'client') {
    return CLIENT_TRANSITIONS[currentStatus]
  }
  return AGENT_TRANSITIONS[currentStatus]
}

export function StatusUpdatePanel({
  currentStatus,
  userRole,
  onUpdate,
  isLoading,
  error,
}: StatusUpdatePanelProps): React.JSX.Element {
  const allowed = getAllowedTransitions(currentStatus, userRole)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900">Cambiar estado</h2>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {allowed.length === 0 ? (
        <p className="text-sm text-gray-500">No hay transiciones disponibles.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allowed.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onUpdate(status)}
              disabled={isLoading}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transitionLabel[status]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
