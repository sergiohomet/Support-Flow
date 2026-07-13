import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { TicketFilters } from '@/store/ticketsSlice'
import type { TicketListItem } from '../schemas'

interface UseTicketListResult {
  isFetching: boolean
  error: string | null
  fetch: () => Promise<void>
}

interface FetchResult {
  tickets: TicketListItem[]
  totalCount: number
  error: string | null
}

async function fetchTickets(filters: TicketFilters): Promise<FetchResult> {
  const { data, error: rpcError } = await supabase.rpc('get_tickets', {
    p_status: filters.status ?? undefined,
    p_priority: filters.priority ?? undefined,
    p_category_id: filters.categoryId ?? undefined,
    p_agent_id: filters.agentId ?? undefined,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  })

  if (rpcError) {
    return { tickets: [], totalCount: 0, error: rpcError.message }
  }

  const mapped: TicketListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIsActive: row.category_is_active,
    clientId: row.client_id,
    clientFullName: row.client_full_name,
    agentId: row.agent_id ?? null,
    agentFullName: row.agent_full_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    commentCount: row.comment_count,
  }))

  const totalCount: number = (data as Array<{ total_count?: number }>)?.[0]?.total_count ?? 0
  return { tickets: mapped, totalCount, error: null }
}

// `enabled` lets the caller gate auto-fetching on its own "is there an active
// filter" condition (TicketListPage only wants to query once the user has
// selected a status tab or typed a search term). The hook re-fetches
// whenever `filters.status`/`filters.page` change in the store — those are
// the only two fields TicketListPage's UI actually mutates today.
export function useTicketList(enabled = false): UseTicketListResult {
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setTickets = useStore((s) => s.setTickets)
  const status = useStore((s) => s.filters.status)
  const page = useStore((s) => s.filters.page)

  const fetch = async (): Promise<void> => {
    setIsFetching(true)
    setError(null)
    try {
      const result = await fetchTickets(useStore.getState().filters)
      if (result.error) {
        setError(result.error)
        return
      }
      setTickets(result.tickets, result.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsFetching(false)
    }
  }

  // See useReportsSummary.ts (src/modules/reports/hooks) for why the fetch
  // logic is a plain function and the effect wraps it in a locally-defined
  // async runner instead of calling it directly — react-hooks/set-state-in-effect
  // flags any effect whose top level calls an outer function (or sets state
  // directly at its top level) that updates state.
  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function run(): Promise<void> {
      setIsFetching(true)
      setError(null)
      try {
        const result = await fetchTickets(useStore.getState().filters)
        if (cancelled) return
        if (result.error) {
          setError(result.error)
          return
        }
        setTickets(result.tickets, result.totalCount)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [status, page, enabled, setTickets])

  return { isFetching, error, fetch }
}
