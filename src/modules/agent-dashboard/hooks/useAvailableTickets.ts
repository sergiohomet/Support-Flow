import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapAgentDashboardTicket } from '../schemas'
import type { AgentDashboardTicket } from '../schemas'

interface UseAvailableTicketsResult {
  tickets: AgentDashboardTicket[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  claim: (ticketId: string) => Promise<boolean>
  claimError: string | null
}

interface FetchResult {
  tickets: AgentDashboardTicket[]
  error: string | null
}

async function fetchAvailableTickets(categoryId: string): Promise<FetchResult> {
  const { data, error: rpcError } = await supabase.rpc('get_tickets', {
    p_status: 'abierto',
    p_category_id: categoryId,
    p_only_unassigned: true,
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

// Agents with no assigned category (categoryId === null) intentionally never
// query — an unscoped get_tickets call across all categories would be
// misleading (an agent could "see" tickets outside their competence). The UI
// is responsible for showing a distinct "no category assigned" empty state.
export function useAvailableTickets(
  categoryId: string | null,
  agentId: string | null
): UseAvailableTicketsResult {
  const [tickets, setTickets] = useState<AgentDashboardTicket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)

  const refetch = async (): Promise<void> => {
    if (!categoryId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchAvailableTickets(categoryId)
      setTickets(result.tickets)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // See src/modules/sla/hooks/useSlaAtRiskTickets.ts for why the fetch logic
  // is a plain function and the effect wraps it in a locally-defined async
  // runner instead of calling it directly — react-hooks/set-state-in-effect
  // flags any effect whose top level calls an outer function (or sets state
  // directly at its top level) that updates state.
  useEffect(() => {
    if (!categoryId) return
    const currentCategoryId = categoryId

    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchAvailableTickets(currentCategoryId)
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
  }, [categoryId])

  const claim = async (ticketId: string): Promise<boolean> => {
    setClaimError(null)
    const { error: rpcError } = await supabase.rpc('assign_ticket', {
      p_ticket_id: ticketId,
      p_agent_id: agentId,
    })

    if (rpcError) {
      setClaimError(parseRpcError(rpcError.message))
      return false
    }

    await refetch()
    return true
  }

  return { tickets, isLoading, error, refetch, claim, claimError }
}
