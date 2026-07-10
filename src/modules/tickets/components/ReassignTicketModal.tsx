import { useEffect, useRef, useState } from 'react'
import { useReassignTicket } from '@/modules/tickets/hooks/useReassignTicket'
import { getEligibleAgents, isAgentAtCapacityLimit } from './eligibleAgents'
import type { Agent } from '@/modules/tickets/schemas'

interface ReassignTicketModalProps {
  ticketId: string
  ticketShortId: string
  ticketCategoryId: string
  currentAgentId: string | null
  currentAgentName: string | null
  agents: Agent[]
  currentUserFullName: string | null
  onClose: () => void
  onSuccess: () => void
}

export function ReassignTicketModal({
  ticketId,
  ticketShortId,
  ticketCategoryId,
  currentAgentId,
  currentAgentName,
  agents,
  currentUserFullName,
  onClose,
  onSuccess,
}: ReassignTicketModalProps): React.JSX.Element {
  const { execute, isLoading, error } = useReassignTicket()

  const [selectedAgentId, setSelectedAgentId] = useState('')
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  const eligibleAgents = getEligibleAgents(agents, ticketCategoryId)
  const selectedAgent = eligibleAgents.find((a) => a.id === selectedAgentId) ?? null
  const isAtLimit = isAgentAtCapacityLimit(selectedAgent)
  const isDisabled = selectedAgentId === '' || selectedAgentId === currentAgentId || isLoading

  useEffect(() => {
    firstFocusRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleConfirm = async () => {
    if (!selectedAgentId) return
    const ok = await execute(ticketId, selectedAgentId)
    if (ok) onSuccess()
  }

  const previewText = selectedAgent
    ? `Ticket reasignado de ${currentAgentName ?? 'Sin asignar'} a ${selectedAgent.fullName} por ${currentUserFullName ?? 'Administrador'}.`
    : null

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-modal-title"
        className="w-full max-w-lg bg-white rounded-lg border border-gray-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 id="reassign-modal-title" className="text-lg font-semibold text-gray-900">
            Reasignar Ticket #{ticketShortId}
          </h2>
          <button
            ref={firstFocusRef}
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span className="material-icons text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Agent selector */}
          <div>
            <label
              htmlFor="agent-select"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Seleccionar Nuevo Agente
            </label>
            <select
              id="agent-select"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccioná un agente...</option>
              {eligibleAgents.map((agent) => (
                <option
                  key={agent.id}
                  value={agent.id}
                  disabled={agent.id === currentAgentId}
                >
                  {agent.fullName} — {agent.activeTicketCount}/5 tickets
                  {agent.id === currentAgentId ? ' (actual)' : ''}
                </option>
              ))}
            </select>
            {eligibleAgents.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">
                No hay agentes disponibles en este momento.
              </p>
            )}
          </div>

          {/* Warning — at limit */}
          {isAtLimit && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 flex gap-3 items-start">
              <span className="material-icons text-red-600 shrink-0 mt-0.5 text-[20px]">error</span>
              <div>
                <h3 className="text-sm font-bold text-red-800">Agente al límite de capacidad</h3>
                <p className="text-sm text-red-700 mt-0.5">
                  Este agente tiene 4/5 tickets activos. Asignarle este ticket lo llevaría al límite de capacidad (5).
                </p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Bitácora preview */}
          {previewText && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="material-icons text-gray-400 text-[18px]">history</span>
                <span className="text-xs font-semibold text-gray-500">Registro en bitácora</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                <span className="font-medium text-gray-800">Se registrará automáticamente:</span>{' '}
                "{previewText}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isDisabled}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <span className="material-icons text-[16px] animate-spin">refresh</span>}
            Confirmar Reasignación
          </button>
        </div>
      </div>
    </div>
  )
}
