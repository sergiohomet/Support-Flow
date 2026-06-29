import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '@/store'
import { useTicketDetail } from '@/modules/tickets/hooks/useTicketDetail'
import { useAssignTicket } from '@/modules/tickets/hooks/useAssignTicket'
import { useUpdateTicketStatus } from '@/modules/tickets/hooks/useUpdateTicketStatus'
import { useAddComment } from '@/modules/tickets/hooks/useAddComment'
import { useTicketList } from '@/modules/tickets/hooks/useTicketList'
import { TicketDetailHeader } from '@/modules/tickets/components/TicketDetailHeader'
import { TicketComments } from '@/modules/tickets/components/TicketComments'
import { TicketStatusLog } from '@/modules/tickets/components/TicketStatusLog'
import { AssignAgentPanel } from '@/modules/tickets/components/AssignAgentPanel'
import { Spinner } from '@/ui/Spinner'
import type { TicketStatus } from '@/modules/tickets/schemas'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const AGENT_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  abierto: ['en_proceso', 'resuelto'],
  en_proceso: ['resuelto', 'abierto'],
  resuelto: ['reabierto'],
  reabierto: ['en_proceso', 'resuelto'],
}

export function TicketDetailPage(): React.ReactElement {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { ticket, comments, statusLog, isLoading: detailLoading, error: detailError, fetch: fetchDetail } = useTicketDetail()
  const { execute: assignTicket, isLoading: assignLoading, error: assignError } = useAssignTicket()
  const { execute: updateStatus, isLoading: statusLoading, error: statusError } = useUpdateTicketStatus()
  const { execute: addComment, isLoading: commentLoading, error: commentError } = useAddComment()
  const { loadAgents } = useTicketList()

  const user = useStore((s) => s.user)
  const agents = useStore((s) => s.agents)

  useEffect(() => {
    if (!id) return
    void fetchDetail(id)
    void loadAgents()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAssign = async (agentId: string): Promise<void> => {
    if (!id) return
    const ok = await assignTicket(id, agentId)
    if (ok) void fetchDetail(id)
  }

  const handleStatusUpdate = async (newStatus: TicketStatus): Promise<void> => {
    if (!id || !ticket) return
    const ok = await updateStatus(id, ticket.status, newStatus)
    if (ok) void fetchDetail(id)
  }

  const handleReturnToPool = async (): Promise<void> => {
    if (!id || !ticket) return
    const ok = await updateStatus(id, ticket.status, 'abierto')
    if (ok) void fetchDetail(id)
  }

  const handleAddComment = async (content: string): Promise<void> => {
    if (!id) return
    await addComment(id, content)
    void fetchDetail(id)
  }

  const isAgentOrAdmin = user?.role === 'agent' || user?.role === 'admin'
  const isClient = user?.role === 'client'

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {detailLoading && !ticket && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {detailError && !ticket && (
        <p className="text-red-600 text-sm">{detailError}</p>
      )}
      {ticket && (
        <>
          <TicketDetailHeader ticket={ticket} onBack={() => navigate(-1)} />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main column — 2/3 */}
            <div className="md:col-span-2 flex flex-col gap-6">
              {/* Descripción */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Descripción</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {/* Activity feed unificado */}
              <TicketComments
                comments={comments}
                statusLog={statusLog}
                ticketClientId={ticket.clientId}
                onAddComment={handleAddComment}
                isLoading={commentLoading}
                error={commentError}
                ticketStatus={ticket.status}
              />
            </div>

            {/* Sidebar — 1/3 */}
            <div className="flex flex-col gap-6">
              {/* Sección Detalles */}
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Detalles</h2>
                  <hr className="mt-1 border-gray-200" />
                </div>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-500 w-24 shrink-0">Agente</dt>
                    <dd className="flex items-center gap-1">
                      <span className="text-gray-900">{ticket.agentFullName ?? 'Sin asignar'}</span>
                      {ticket.agentFullName && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">
                          Agente
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-500 w-24 shrink-0">Cliente</dt>
                    <dd className="flex items-center gap-1">
                      <span className="text-gray-900">{ticket.clientFullName}</span>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                        Cliente
                      </span>
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-500 w-24 shrink-0">Creado</dt>
                    <dd className="text-gray-900">{formatDate(ticket.createdAt)}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="text-gray-500 w-24 shrink-0">Actualizado</dt>
                    <dd className="text-gray-900">{formatDate(ticket.updatedAt)}</dd>
                  </div>
                </dl>
                {/* SLA placeholder estático */}
                <div className="bg-orange-50 border border-orange-200 rounded p-2 flex items-center gap-1.5">
                  <span className="material-icons text-orange-500 text-base">schedule</span>
                  <span className="text-xs text-orange-700">SLA no configurado</span>
                </div>
              </div>

              {/* Sección Acciones */}
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Acciones</h2>
                  <hr className="mt-1 border-gray-200" />
                </div>

                {statusError && (
                  <div
                    role="alert"
                    className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
                  >
                    {statusError}
                  </div>
                )}

                {(() => {
                  const actions: React.ReactNode[] = []

                  if (isAgentOrAdmin) {
                    const allowed = AGENT_TRANSITIONS[ticket.status]

                    if (allowed.includes('resuelto')) {
                      actions.push(
                        <button
                          key="resolver"
                          type="button"
                          onClick={() => void handleStatusUpdate('resuelto')}
                          disabled={statusLoading}
                          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Resolver Ticket
                        </button>
                      )
                    }

                    if (ticket.agentId !== null) {
                      actions.push(
                        <button
                          key="pool"
                          type="button"
                          onClick={() => void handleReturnToPool()}
                          disabled={statusLoading}
                          className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Devolver al pool
                        </button>
                      )
                    }
                  }

                  if (isClient && ticket.status === 'resuelto') {
                    actions.push(
                      <button
                        key="reabrir"
                        type="button"
                        onClick={() => void handleStatusUpdate('reabierto')}
                        disabled={statusLoading}
                        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reabrir Ticket
                      </button>
                    )
                  }

                  if (actions.length === 0) {
                    return <p className="text-sm text-gray-500">Sin acciones disponibles.</p>
                  }

                  return <div className="flex flex-col gap-2">{actions}</div>
                })()}
              </div>

              {/* AssignAgentPanel — agent/admin only */}
              {isAgentOrAdmin && (
                <AssignAgentPanel
                  agents={agents}
                  currentAgentId={ticket.agentId}
                  onAssign={handleAssign}
                  isLoading={assignLoading}
                  error={assignError}
                />
              )}

              {/* Sección Registro de Estado */}
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Registro de Estado</h2>
                  <hr className="mt-1 border-gray-200" />
                </div>
                <TicketStatusLog statusLog={statusLog} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
