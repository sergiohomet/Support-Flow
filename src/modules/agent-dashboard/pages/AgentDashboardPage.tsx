import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@/store'
import { supabase } from '@/core/supabase/client'
import { MAX_ACTIVE_TICKETS_PER_AGENT } from '@/modules/tickets/components/eligibleAgents'
import { useMyAssignedTickets } from '../hooks/useMyAssignedTickets'
import { useAgentMetrics } from '../hooks/useAgentMetrics'
import { AssignedTicketCard } from '../components/AssignedTicketCard'
import { CapacityBar } from '../components/CapacityBar'
import { SummaryCard } from '@/modules/sla/components/SummaryCard'
import { TicketCardShell } from '@/ui/TicketCardShell'
import { StatusBadge } from '@/ui/StatusBadge'
import { formatDateOnly } from '@/core/utils/format'
import { parseRpcError } from '@/core/utils/parseRpcError'
import type { TicketStatus } from '@/modules/tickets/schemas'
import type { TicketListItem } from '@/store/ticketsSlice'

type ListMode = 'assigned' | 'available'

const AVAILABLE_PAGE_SIZE = 5

function getSlaVariant(pct: number): 'success' | 'neutral' | 'danger' {
  if (pct >= 80) return 'success'
  if (pct >= 70) return 'neutral'
  return 'danger'
}

function mapRpcRowToTicketListItem(row: Record<string, unknown>): TicketListItem {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as TicketStatus,
    priority: row.priority as TicketListItem['priority'],
    categoryId: row.category_id as string,
    categoryName: row.category_name as string,
    categoryIsActive: row.category_is_active as boolean,
    clientId: row.client_id as string,
    clientFullName: row.client_full_name as string,
    agentId: (row.agent_id as string) ?? null,
    agentFullName: (row.agent_full_name as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    commentCount: row.comment_count as number,
  }
}

export function AgentDashboardPage(): React.JSX.Element {
  const user = useStore((s) => s.user)
  const agentId = user?.id ?? null

  const metrics = useAgentMetrics(agentId)
  const assigned = useMyAssignedTickets(agentId)

  const [listMode, setListMode] = useState<ListMode>('assigned')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [returningId, setReturningId] = useState<string | null>(null)

  // ── Available tickets state ──────────────────────────────────────────
  const [availableTickets, setAvailableTickets] = useState<TicketListItem[]>([])
  const [availableLoading, setAvailableLoading] = useState(false)
  const [availableError, setAvailableError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [availablePage, setAvailablePage] = useState(1)
  const [availableTotalPages, setAvailableTotalPages] = useState(1)

  const fetchAvailable = useCallback(
    async (page: number): Promise<void> => {
      if (!agentId) return
      setAvailableLoading(true)
      setAvailableError(null)
      try {
        const { data, error: rpcError } = await supabase.rpc('get_tickets', {
          p_only_unassigned: true,
          p_status: 'abierto' as TicketStatus,
          p_page: page,
          p_page_size: AVAILABLE_PAGE_SIZE,
        })
        if (rpcError) {
          setAvailableError(parseRpcError(rpcError.message))
          return
        }
        const rows = (data ?? []) as Array<Record<string, unknown>>
        const mapped: TicketListItem[] = rows.map(mapRpcRowToTicketListItem)
        setAvailableTickets(mapped)
        const totalCount: number =
          (rows[0] as Record<string, unknown>)?.total_count as number ?? 0
        setAvailableTotalPages(Math.max(1, Math.ceil(totalCount / AVAILABLE_PAGE_SIZE)))
      } catch (err) {
        setAvailableError(err instanceof Error ? err.message : String(err))
      } finally {
        setAvailableLoading(false)
      }
    },
    [agentId],
  )

  useEffect(() => {
    if (listMode === 'available') {
      void fetchAvailable(availablePage)
    }
  }, [listMode, availablePage, fetchAvailable])

  const handleClaim = async (ticketId: string): Promise<void> => {
    if (!agentId) return
    setClaimingId(ticketId)
    try {
      const { error: rpcError } = await supabase.rpc('assign_ticket', {
        p_ticket_id: ticketId,
        p_agent_id: agentId,
      })
      if (rpcError) {
        setAvailableError(parseRpcError(rpcError.message))
        return
      }
      // Refetch current page so the claimed ticket disappears,
      // plus assigned list + metrics so CapacityBar updates
      await fetchAvailable(availablePage)
      void assigned.refetch()
      void metrics.refetch()
    } catch (err) {
      setAvailableError(err instanceof Error ? err.message : String(err))
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

  const errorMessage = metrics.error ?? assigned.error

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Mi Panel de Agente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestioná tus tickets asignados y revisá tus métricas.
        </p>
      </div>

      {errorMessage && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <SummaryCard
          label="Asignados"
          value={metrics.data?.assignedCount ?? 0}
          caption="tickets activos"
          variant="neutral"
        />
        <SummaryCard
          label="Resueltos (mes)"
          value={metrics.data?.resolvedThisMonth ?? 0}
          caption="este mes"
          variant="success"
        />
        <SummaryCard
          label="SLA cumplido"
          value={
            metrics.data?.slaCompliancePct != null
              ? Math.round(metrics.data.slaCompliancePct)
              : 0
          }
          caption={
            metrics.data?.slaCompliancePct != null ? '% del total' : 'Sin datos'
          }
          variant={
            metrics.data?.slaCompliancePct != null
              ? getSlaVariant(metrics.data.slaCompliancePct)
              : 'neutral'
          }
        />
        <SummaryCard
          label="Tiempo prom. resolución"
          value={
            metrics.data?.avgResolutionHours != null
              ? Math.round(metrics.data.avgResolutionHours * 10) / 10
              : 0
          }
          caption={
            metrics.data?.avgResolutionHours != null ? 'horas' : 'Sin datos'
          }
          variant="neutral"
        />
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setListMode('assigned')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            listMode === 'assigned'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Asignados
        </button>
        <button
          type="button"
          onClick={() => setListMode('available')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            listMode === 'available'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Disponibles
        </button>
      </div>

      {/* ── Assigned tab ────────────────────────────────────────────── */}
      {listMode === 'assigned' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Mis Tickets Asignados
            </h2>
          </div>

          <CapacityBar
            current={assigned.tickets.length}
            max={MAX_ACTIVE_TICKETS_PER_AGENT}
          />

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
                  currentUserId={agentId}
                  isResolving={resolvingId === ticket.id}
                  isReturning={returningId === ticket.id}
                  onResolve={() => void handleResolve(ticket.id)}
                  onReturnToPool={() => void handleReturnToPool(ticket.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Available tab ───────────────────────────────────────────── */}
      {listMode === 'available' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Tickets Disponibles
            </h2>
          </div>

          {availableLoading && (
            <div className="flex justify-center py-12">
              <span className="material-icons text-4xl text-gray-300 animate-spin">
                refresh
              </span>
            </div>
          )}

          {availableError && (
            <div
              role="alert"
              className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
            >
              {availableError}
            </div>
          )}

          {!availableLoading && !availableError && availableTickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="material-icons text-5xl mb-3">inbox</span>
              <p className="text-sm">
                No hay tickets disponibles para tomar en este momento.
              </p>
            </div>
          )}

          {!availableLoading && availableTickets.length > 0 && (
            <div className="flex flex-col gap-3">
              {availableTickets.map((ticket) => (
                <TicketCardShell
                  key={ticket.id}
                  id={ticket.id}
                  title={ticket.title}
                  description={ticket.description}
                  badges={
                    <>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {ticket.categoryName}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </>
                  }
                  meta={
                    <span className="text-xs text-gray-400">
                      {formatDateOnly(ticket.createdAt)}
                    </span>
                  }
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleClaim(ticket.id)
                    }}
                    disabled={claimingId === ticket.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claimingId === ticket.id && (
                      <span
                        className="material-icons text-[14px] animate-spin"
                        aria-hidden="true"
                      >
                        refresh
                      </span>
                    )}
                    Tomar ticket
                  </button>
                </TicketCardShell>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!availableLoading && availableTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setAvailablePage((p) => Math.max(1, p - 1))}
                disabled={availablePage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-500">
                Página {availablePage} de {availableTotalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setAvailablePage((p) => Math.min(availableTotalPages, p + 1))
                }
                disabled={availablePage >= availableTotalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
