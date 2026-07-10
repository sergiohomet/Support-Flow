import type { TicketStatus } from '@/modules/tickets/schemas'

const AGENT_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  abierto: ['en_proceso', 'resuelto'],
  en_proceso: ['resuelto', 'abierto'],
  resuelto: ['reabierto'],
  reabierto: ['en_proceso', 'resuelto'],
}

interface TicketActionsProps {
  status: TicketStatus
  categoryIsActive: boolean
  agentId: string | null
  isAgentOrAdmin: boolean
  isClient: boolean
  statusLoading: boolean
  unassignLoading: boolean
  onResolve: () => void
  onReturnToPool: () => void
  onReopen: () => void
}

export function TicketActions({
  status,
  categoryIsActive,
  agentId,
  isAgentOrAdmin,
  isClient,
  statusLoading,
  unassignLoading,
  onResolve,
  onReturnToPool,
  onReopen,
}: TicketActionsProps): React.JSX.Element {
  const actions: React.ReactNode[] = []

  if (isAgentOrAdmin) {
    const allowed = AGENT_TRANSITIONS[status]

    if (allowed.includes('resuelto')) {
      actions.push(
        <button
          key="resolver"
          type="button"
          onClick={onResolve}
          disabled={statusLoading}
          className="w-full rounded-lg bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 text-sm font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-icons text-[18px]">check_circle</span>
          Resolver Ticket
        </button>
      )
    }

    if (agentId !== null) {
      actions.push(
        <button
          key="pool"
          type="button"
          onClick={onReturnToPool}
          disabled={unassignLoading}
          className="w-full rounded-lg border border-gray-200 bg-transparent text-gray-600 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {unassignLoading ? 'Devolviendo...' : 'Devolver al pool'}
        </button>
      )
    }
  }

  if (isClient && status === 'resuelto') {
    if (categoryIsActive) {
      actions.push(
        <button
          key="reabrir"
          type="button"
          onClick={onReopen}
          disabled={statusLoading}
          className="w-full rounded-lg border border-green-300 bg-green-50 text-green-700 px-4 py-2.5 text-sm font-medium hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-icons text-[18px]">refresh</span>
          Reabrir Ticket
        </button>
      )
    } else {
      actions.push(
        <p key="reabrir-blocked" className="text-sm text-gray-500">
          Esta categoría fue deshabilitada. Creá un nuevo ticket con una categoría activa.
        </p>
      )
    }
  }

  if (actions.length === 0) {
    return <p className="text-sm text-gray-400">Sin acciones disponibles.</p>
  }

  return <div className="flex flex-col gap-2">{actions}</div>
}
