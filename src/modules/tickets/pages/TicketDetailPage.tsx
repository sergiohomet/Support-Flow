import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '@/store'
import { useTicketDetail } from '@/modules/tickets/hooks/useTicketDetail'
import { useUpdateTicketStatus } from '@/modules/tickets/hooks/useUpdateTicketStatus'
import { useAddComment } from '@/modules/tickets/hooks/useAddComment'
import { useAgentList } from '@/modules/tickets/hooks/useAgentList'
import { useAcceptAiTriage } from '@/modules/tickets/hooks/useAcceptAiTriage'
import { useCategoryList } from '@/modules/tickets/hooks/useCategoryList'
import { TicketComments } from '@/modules/tickets/components/TicketComments'
import { TicketStatusLog } from '@/modules/tickets/components/TicketStatusLog'
import { TicketActions } from '@/modules/tickets/components/TicketActions'
import { ReassignTicketModal } from '@/modules/tickets/components/ReassignTicketModal'
import { AITriagePanel } from '@/modules/tickets/components/AITriagePanel'
import { StatusBadge } from '@/ui/StatusBadge'
import { PriorityBadge } from '@/ui/PriorityBadge'
import { Spinner } from '@/ui/Spinner'
import { useUnassignTicket } from '@/modules/tickets/hooks/useUnassignTicket'
import { getSlaStatus } from './slaStatus'
import { formatDateOnly } from '@/core/utils/format'
import type { TicketStatus } from '@/modules/tickets/schemas'

export function TicketDetailPage(): React.ReactElement {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [isReassignOpen, setIsReassignOpen] = useState(false)

  const { ticket, comments, statusLog, isLoading: detailLoading, error: detailError, refetch: fetchDetail } = useTicketDetail(id)
  const { execute: updateStatus, isLoading: statusLoading, error: statusError } = useUpdateTicketStatus()
  const { execute: unassignTicket, isLoading: unassignLoading, error: unassignError } = useUnassignTicket()
  const { execute: addComment, isLoading: commentLoading, error: commentError } = useAddComment()
  const { loadAgents } = useAgentList()
  const {
    acceptCategory,
    acceptPriority,
    dismissTriage,
    isAcceptingCategory,
    isAcceptingPriority,
    isDismissing,
  } = useAcceptAiTriage()
  useCategoryList()

  const [prefillContent, setPrefillContent] = useState<string | undefined>(undefined)
  // Se setea en el momento en que se hace click en "Usar como respuesta"; se consume (y la
  // sugerencia se descarta) una vez que esa respuesta efectivamente se envía — ver
  // handleAddComment. La sugerencia se genera una sola vez a partir de la descripción
  // original del ticket, nunca se regenera a partir de comentarios posteriores, así que una vez
  // que se actuó sobre ella (ignorada, o usada como base de una respuesta enviada) no
  // debe volver a aparecer.
  const [usedSuggestionAsResponse, setUsedSuggestionAsResponse] = useState(false)

  const user = useStore((s) => s.user)
  const agents = useStore((s) => s.agents)
  const categories = useStore((s) => s.categories)

  useEffect(() => {
    void loadAgents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusUpdate = async (newStatus: TicketStatus): Promise<void> => {
    if (!id || !ticket) return
    const ok = await updateStatus(id, newStatus)
    if (ok) void fetchDetail()
  }

  const handleReturnToPool = async (): Promise<void> => {
    if (!id) return
    const ok = await unassignTicket(id)
    if (ok) void fetchDetail()
  }

  const handleAddComment = async (content: string): Promise<void> => {
    if (!id) return
    const comment = await addComment(id, content)
    if (comment && usedSuggestionAsResponse) {
      setUsedSuggestionAsResponse(false)
      await dismissTriage(id)
    }
    void fetchDetail()
  }

  const handleAcceptCategory = async (): Promise<void> => {
    if (!ticket?.aiTriage) return
    const ok = await acceptCategory(ticket.id, ticket.aiTriage.suggestedCategoryId)
    if (ok) void fetchDetail()
  }

  const handleAcceptPriority = async (): Promise<void> => {
    if (!ticket?.aiTriage) return
    const ok = await acceptPriority(ticket.id, ticket.aiTriage.suggestedPriority)
    if (ok) void fetchDetail()
  }

  const handleUseAsResponse = (): void => {
    if (!ticket?.aiTriage) return
    setPrefillContent(ticket.aiTriage.suggestedResponse)
    setUsedSuggestionAsResponse(true)
  }

  const handlePrefillConsumed = (): void => {
    setPrefillContent(undefined)
  }

  const handleDismissTriage = async (): Promise<void> => {
    if (!ticket) return
    const ok = await dismissTriage(ticket.id)
    if (ok) void fetchDetail()
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
          {/* Migas de pan */}
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

          {/* Banner resuelto */}
          {ticket.status === 'resuelto' && (
            <div className="bg-green-50 border-l-4 border-green-500 px-4 py-3 rounded-lg mb-1 flex items-start gap-3">
              <span className="material-icons text-green-700 mt-0.5 text-[20px]">check_circle</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Este ticket fue resuelto.</p>
                <p className="text-sm text-green-700 mt-0.5">¿El problema persiste? Podés reabrirlo.</p>
              </div>
            </div>
          )}

          <div className="flex gap-6">
            {/* Columna principal — 65% */}
            <div className="flex-[0_0_65%] min-w-0 flex flex-col gap-5">
              {/* Encabezado + Descripción — un solo card */}
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

              {/* Feed de actividad */}
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
                prefillContent={prefillContent}
                onPrefillConsumed={handlePrefillConsumed}
              />
            </div>

            {/* Barra lateral — 35% */}
            <div className="flex-[0_0_35%] min-w-0 flex flex-col gap-5">
              {/* Sugerencias IA — solo agente/admin */}
              {isAgentOrAdmin && ticket.aiTriage && (
                <AITriagePanel
                  aiTriage={ticket.aiTriage}
                  currentCategoryId={ticket.categoryId}
                  currentPriority={ticket.priority}
                  categoryName={categories.find((c) => c.id === ticket.aiTriage?.suggestedCategoryId)?.name ?? null}
                  onAcceptCategory={() => void handleAcceptCategory()}
                  onAcceptPriority={() => void handleAcceptPriority()}
                  onUseAsResponse={handleUseAsResponse}
                  onDismiss={() => void handleDismissTriage()}
                  isAcceptingCategory={isAcceptingCategory}
                  isAcceptingPriority={isAcceptingPriority}
                  isDismissing={isDismissing}
                />
              )}

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
                      <span className="text-sm text-gray-900">{formatDateOnly(ticket.createdAt)}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 mb-0.5">Actualizado</span>
                      <span className="text-sm text-gray-900">{formatDateOnly(ticket.updatedAt)}</span>
                    </div>
                  </div>

                  {/* SLA */}
                  {(() => {
                    const sla = getSlaStatus(ticket)
                    return (
                      <div className={`${sla.boxClass} border rounded p-3`}>
                        <span className="block text-xs text-gray-400 mb-1">SLA Resolución</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`material-icons text-base ${sla.iconClass}`}>{sla.icon}</span>
                          <span className={`text-sm font-medium ${sla.textClass}`}>{sla.label}</span>
                        </div>
                        {sla.detail && (
                          <span className="block text-xs text-gray-500 mt-1">{sla.detail}</span>
                        )}
                      </div>
                    )
                  })()}
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

                <TicketActions
                  status={ticket.status}
                  categoryIsActive={ticket.categoryIsActive}
                  agentId={ticket.agentId}
                  isAgentOrAdmin={isAgentOrAdmin}
                  isClient={isClient}
                  statusLoading={statusLoading}
                  unassignLoading={unassignLoading}
                  onResolve={() => void handleStatusUpdate('resuelto')}
                  onReturnToPool={() => void handleReturnToPool()}
                  onReopen={() => void handleStatusUpdate('reabierto')}
                />
              </div>

              {/* Reasignar agente — solo admin */}
              {user?.role === 'admin' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsReassignOpen(true)}
                    className="w-full rounded-lg border border-gray-200 bg-white text-gray-700 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-icons text-[18px]">swap_horiz</span>
                    Reasignar Ticket
                  </button>
                  {isReassignOpen && (
                    <ReassignTicketModal
                      ticketId={ticket.id}
                      ticketShortId={ticket.id.slice(0, 8)}
                      currentAgentId={ticket.agentId}
                      currentAgentName={ticket.agentFullName ?? null}
                      ticketCategoryId={ticket.categoryId}
                      agents={agents}
                      currentUserFullName={user?.full_name ?? null}
                      onClose={() => setIsReassignOpen(false)}
                      onSuccess={() => {
                        setIsReassignOpen(false)
                        void fetchDetail()
                      }}
                    />
                  )}
                </>
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
