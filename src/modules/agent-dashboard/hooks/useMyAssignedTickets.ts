import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { useUpdateTicketStatus } from '@/modules/tickets/hooks/useUpdateTicketStatus'
import { useUnassignTicket } from '@/modules/tickets/hooks/useUnassignTicket'
import { mapAgentDashboardTicket } from '../schemas'
import type { AgentDashboardTicket } from '../schemas'

interface UseMyAssignedTicketsResult {
  tickets: AgentDashboardTicket[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  resolve: (ticketId: string) => Promise<boolean>
  returnToPool: (ticketId: string) => Promise<boolean>
}

interface FetchResult {
  tickets: AgentDashboardTicket[]
  error: string | null
}

async function fetchMyAssignedTickets(agentId: string): Promise<FetchResult> {
  const { data, error: rpcError } = await supabase.rpc('get_tickets', {
    p_agent_id: agentId,
    p_active_only: true,
    p_page_size: 50,
  })

  if (rpcError) {
    return { tickets: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (data as Array<Record<string, unknown>>) ?? []
  return {
    tickets: rows.map((row) =>
      mapAgentDashboardTicket(row as Parameters<typeof mapAgentDashboardTicket>[0])
    ),
    error: null,
  }
}

// `resolve`/`returnToPool` reutilizan los hooks
// useUpdateTicketStatus/useUnassignTicket ya existentes del módulo tickets
// en lugar de volver a llamar directamente a los mismos RPCs — mismo
// comportamiento de wrapping (loading/error/parseRpcError), sin lógica de
// llamada a RPC duplicada.
export function useMyAssignedTickets(agentId: string | null): UseMyAssignedTicketsResult {
  const [tickets, setTickets] = useState<AgentDashboardTicket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { execute: updateStatus } = useUpdateTicketStatus()
  const { execute: unassign } = useUnassignTicket()

  const refetch = async (): Promise<void> => {
    if (!agentId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchMyAssignedTickets(agentId)
      setTickets(result.tickets)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // Ver src/modules/sla/hooks/useSlaAtRiskTickets.ts para entender por qué
  // la lógica de fetch es una función plana y el efecto la envuelve en un
  // runner async definido localmente en lugar de llamarla directamente —
  // react-hooks/set-state-in-effect marca cualquier efecto cuyo nivel
  // superior llame a una función externa (o setee estado directamente en
  // su nivel superior) que actualice estado.
  useEffect(() => {
    if (!agentId) return
    const currentAgentId = agentId

    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchMyAssignedTickets(currentAgentId)
        if (cancelled) return
        setTickets(result.tickets)
        setError(result.error)
      } catch (err) {
        if (!cancelled) setError(parseRpcError(err instanceof Error ? err.message : String(err)))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [agentId])

  const resolve = async (ticketId: string): Promise<boolean> => {
    const ok = await updateStatus(ticketId, 'resuelto')
    if (ok) await refetch()
    return ok
  }

  const returnToPool = async (ticketId: string): Promise<boolean> => {
    const ok = await unassign(ticketId)
    if (ok) await refetch()
    return ok
  }

  return { tickets, isLoading, error, refetch, resolve, returnToPool }
}
