import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '@/store'
import { useTicketDetail } from '@/modules/tickets/hooks/useTicketDetail'
import { useAssignTicket } from '@/modules/tickets/hooks/useAssignTicket'
import { useUpdateTicketStatus } from '@/modules/tickets/hooks/useUpdateTicketStatus'
import { useAddComment } from '@/modules/tickets/hooks/useAddComment'
import { useTicketList } from '@/modules/tickets/hooks/useTicketList'
import { TicketComments } from '@/modules/tickets/components/TicketComments'
import { TicketStatusLog } from '@/modules/tickets/components/TicketStatusLog'
import { AssignAgentPanel } from '@/modules/tickets/components/AssignAgentPanel'
import { StatusBadge } from '@/ui/StatusBadge'
import { PriorityBadge } from '@/ui/PriorityBadge'
import { Spinner } from '@/ui/Spinner'
import { useUnassignTicket } from '@/modules/tickets/hooks/useUnassignTicket'
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
  const { execute: unassignTicket, isLoading: unassignLoading, error: unassignError } = useUnassignTicket()
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
    if (!id) return
    const ok = await unassignTicket(id)
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
    <div className="max-w-[1280px] mx-auto px-6 py-6">
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
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex text-xs text-gray-500 mb-5">
            <ol className="inline-flex items-center gap-1">
              <li>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="hover:text-blue-600 transition-colors"
                >
                  Mis Tickets
                </button>
              </li>
              <li>
                <span className="material-icons text-sm leading-none">chevron_right</span>
              </li>
              <li className="text-gray-800 font-medium">#{ticket.id.slice(0, 8)}</li>
            </ol>
          </nav>

          <div className="flex gap-6">
            {/* Main column — 65% */}
            <div className="flex-[0_0_65%] min-w-0 flex flex-col gap-5">
              {/* Header + Descripción — un solo card */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-mono text-xs text-gray-400 shrink-0">
                      #{ticket.id.slice(0, 8)}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                      {ticket.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <StatusBadge status={ticket.status} />
                    {ticket.categoryName && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium">
                        {ticket.categoryName}
                      </span>
                    )}
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {/* Activity feed */}
              <TicketComments
                comments={comments}
                statusLog={statusLog}
                ticketClientId={ticket.clientId}
                ticketAgentId={ticket.agentId}
                currentUserId={user?.id ?? null}
                onAddComment={handleAddComment}
                isLoading={commentLoading}
                error={commentError}
                ticketStatus={ticket.status}
              />
            </div>

            {/* Sidebar — 35% */}
            <div className="flex-[0_0_35%] min-w-0 flex flex-col gap-5">
              {/* Detalles */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Detalles</h3>
                <div className="flex flex-col gap-4">
                  {/* Asignado a */}
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Asignado a
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-medium shrink-0">
                        {ticket.agentFullName ? ticket.agentFullName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.agentFullName ?? 'Sin asignar'}
                        </div>
                        {ticket.agentFullName && (
                          <div className="text-xs text-gray-500">Agente de soporte</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div>
                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Cliente
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium shrink-0">
                        {ticket.clientFullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.clientFullName}
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* Fechas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-xs text-gray-400 mb-0.5">Creado</span>
                      <span className="text-sm text-gray-900">{formatDate(ticket.createdAt)}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 mb-0.5">Actualizado</span>
                      <span className="text-sm text-gray-900">{formatDate(ticket.updatedAt)}</span>
                    </div>
                  </div>

                  {/* SLA placeholder */}
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <span className="block text-xs text-gray-400 mb-1">SLA Resolución</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-icons text-base text-gray-400">schedule</span>
                      <span className="text-sm text-gray-500">No configurado</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Acciones</h3>

                {(statusError ?? unassignError) && (
                  <div
                    role="alert"
                    className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-3"
                  >
                    {statusError ?? unassignError}
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
                          className="w-full rounded-lg bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 text-sm font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-icons text-[18px]">check_circle</span>
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
                          disabled={unassignLoading}
                          className="w-full rounded-lg border border-gray-200 bg-transparent text-gray-600 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {unassignLoading ? 'Devolviendo...' : 'Devolver al pool'}
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
                        className="w-full rounded-lg border border-gray-200 bg-transparent text-gray-600 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reabrir Ticket
                      </button>
                    )
                  }

                  if (actions.length === 0) {
                    return <p className="text-sm text-gray-400">Sin acciones disponibles.</p>
                  }

                  return <div className="flex flex-col gap-2">{actions}</div>
                })()}
              </div>

              {/* Asignar agente — agent/admin only */}
              {isAgentOrAdmin && (
                <AssignAgentPanel
                  agents={agents}
                  currentAgentId={ticket.agentId}
                  onAssign={handleAssign}
                  isLoading={assignLoading}
                  error={assignError}
                />
              )}

              {/* Registro de Estado */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Registro de Estado</h3>
                <TicketStatusLog statusLog={statusLog} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
