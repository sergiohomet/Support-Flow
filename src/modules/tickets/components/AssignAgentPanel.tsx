import { useEffect, useState } from 'react'
import type { Agent } from '@/modules/tickets/schemas'

interface AssignAgentPanelProps {
  agents: Agent[]
  currentAgentId: string | null
  onAssign: (agentId: string) => void
  isLoading: boolean
  error: string | null
}

const ACTIVE_TICKET_WARNING_THRESHOLD = 4

export function AssignAgentPanel({
  agents,
  currentAgentId,
  onAssign,
  isLoading,
  error,
}: AssignAgentPanelProps): React.JSX.Element {
  const [selectedAgentId, setSelectedAgentId] = useState(currentAgentId ?? '')

  useEffect(() => {
    setSelectedAgentId(currentAgentId ?? '')
  }, [currentAgentId])

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null
  const isSameAgent = selectedAgentId !== '' && selectedAgentId === currentAgentId
  const isDisabled = isLoading || selectedAgentId === '' || isSameAgent

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setSelectedAgentId(e.target.value)
  }

  const handleAssign = (): void => {
    if (isDisabled) return
    onAssign(selectedAgentId)
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900">Asignar agente</h2>

      <div className="flex flex-col gap-2">
        <select
          value={selectedAgentId}
          onChange={handleChange}
          disabled={isLoading}
          aria-label="Seleccionar agente"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        >
          <option value="">Seleccioná un agente</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.fullName} ({agent.activeTicketCount} tickets activos)
            </option>
          ))}
        </select>

        {/* Warning: approaching ticket limit */}
        {selectedAgent !== null &&
          selectedAgent.activeTicketCount >= ACTIVE_TICKET_WARNING_THRESHOLD && (
            <div
              role="alert"
              className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700"
            >
              Este agente tiene {selectedAgent.activeTicketCount} tickets activos. El límite es 5.
            </div>
          )}

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAssign}
          disabled={isDisabled}
          className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Asignando...' : 'Asignar'}
        </button>
      </div>
    </div>
  )
}
