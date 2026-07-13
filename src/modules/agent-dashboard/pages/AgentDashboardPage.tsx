import { useState } from 'react'
import { useStore } from '@/store'
import { isAgentAtCapacityLimit, MAX_ACTIVE_TICKETS_PER_AGENT } from '@/modules/tickets/components/eligibleAgents'
import { useAvailableTickets } from '../hooks/useAvailableTickets'
import { useMyAssignedTickets } from '../hooks/useMyAssignedTickets'
import { AvailableTicketCard } from '../components/AvailableTicketCard'
import { AssignedTicketCard } from '../components/AssignedTicketCard'
import { CapacityBar } from '../components/CapacityBar'

export function AgentDashboardPage(): React.JSX.Element {
  const user = useStore((s) => s.user)
  const agentId = user?.id ?? null
  const categoryId = user?.category_id ?? null

  const available = useAvailableTickets(categoryId, agentId)
  const assigned = useMyAssignedTickets(agentId)

  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [returningId, setReturningId] = useState<string | null>(null)

  // Warning-only state, per the resolved design decision (mirrors
  // ReassignTicketModal's at-limit UX): the claim button stays enabled even
  // when the agent is near capacity — the DB's validate_agent_limit trigger
  // is the actual enforcement, this is just a heads-up.
  const isAtCapacity = isAgentAtCapacityLimit({ activeTicketCount: assigned.tickets.length })

  const handleClaim = async (ticketId: string): Promise<void> => {
    setClaimingId(ticketId)
    try {
      await available.claim(ticketId)
    } finally {
      setClaimingId(null)
    }
  }

  const handleResolve = async (ticketId: string): Promise<void> => {
    setResolvingId(ticketId)
    try {
      await assigned.resolve(ticketId)
    } finally {
      setResolvingId(null)
    }
  }

  const handleReturnToPool = async (ticketId: string): Promise<void> => {
    setReturningId(ticketId)
    try {
      await assigned.returnToPool(ticketId)
    } finally {
      setReturningId(null)
    }
  }

  const errorMessage = available.error ?? assigned.error ?? available.claimError

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Mi Panel de Agente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tomá tickets disponibles en tu categoría y gestioná tus tickets asignados.
        </p>
      </div>

      {errorMessage && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column — available tickets */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Tickets Disponibles
          </h2>

          {!categoryId ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              No tenés una categoría asignada. Contactá a un administrador para que te asigne una.
            </p>
          ) : available.tickets.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              No hay tickets disponibles en tu categoría en este momento.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {available.tickets.map((ticket) => (
                <AvailableTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  disabled={isAtCapacity}
                  isClaiming={claimingId === ticket.id}
                  onClaim={() => void handleClaim(ticket.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right column — assigned tickets + capacity */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Mis Tickets Asignados
            </h2>
          </div>

          <CapacityBar current={assigned.tickets.length} max={MAX_ACTIVE_TICKETS_PER_AGENT} />

          {assigned.tickets.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              No tenés tickets asignados en este momento.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {assigned.tickets.map((ticket) => (
                <AssignedTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isResolving={resolvingId === ticket.id}
                  isReturning={returningId === ticket.id}
                  onResolve={() => void handleResolve(ticket.id)}
                  onReturnToPool={() => void handleReturnToPool(ticket.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
