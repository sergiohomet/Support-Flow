import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapTicketsByCategory } from '../schemas'
import type { TicketsByCategory } from '../schemas'

interface UseReportsTicketsByCategoryResult {
  data: TicketsByCategory[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface FetchResult {
  data: TicketsByCategory[]
  error: string | null
}

async function fetchTicketsByCategory(dateFrom: string, dateTo: string): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_reports_tickets_by_category', {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (rpcError) {
    return { data: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  return { data: rows.map((row) => mapTicketsByCategory(row as Parameters<typeof mapTicketsByCategory>[0])), error: null }
}

export function useReportsTicketsByCategory(
  dateFrom: string,
  dateTo: string
): UseReportsTicketsByCategoryResult {
  const [data, setData] = useState<TicketsByCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track the latest refetch across renders so the realtime effect can call
  // it without re-subscribing every time the function identity changes.
  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchTicketsByCategory(dateFrom, dateTo)
      setData(result.data)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // See useReportsSummary.ts for why the fetch logic is a plain function
  // and the effect wraps it in a locally-defined async runner instead of
  // calling it directly — react-hooks/set-state-in-effect flags any effect
  // whose top level calls an outer function (or sets state directly at its
  // top level) that updates state.
  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchTicketsByCategory(dateFrom, dateTo)
        if (cancelled) return
        setData(result.data)
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
  }, [dateFrom, dateTo])

  useEffect(() => {
    refetchRef.current = refetch
  })

  // This RPC is admin-only and authorizes server-side (SECURITY DEFINER), so
  // there is no client-side filter to apply here — the subscription is just
  // a "something changed, refetch" signal. Subscribes once for the hook's
  // lifetime, independent of dateFrom/dateTo.
  useEffect(() => {
    const channel = supabase
      .channel('reports-tickets-by-category')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        () => {
          void refetchRef.current?.()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        () => {
          void refetchRef.current?.()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return { data, isLoading, error, refetch }
}
