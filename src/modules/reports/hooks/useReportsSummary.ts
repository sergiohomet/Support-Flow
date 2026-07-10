import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapReportsSummary } from '../schemas'
import type { ReportsSummary } from '../schemas'

interface UseReportsSummaryResult {
  data: ReportsSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface FetchResult {
  data: ReportsSummary | null
  error: string | null
}

async function fetchReportsSummary(dateFrom: string, dateTo: string): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_reports_summary', {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (rpcError) {
    return { data: null, error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  const row = rows[0]
  return { data: row ? mapReportsSummary(row as Parameters<typeof mapReportsSummary>[0]) : null, error: null }
}

export function useReportsSummary(dateFrom: string, dateTo: string): UseReportsSummaryResult {
  const [data, setData] = useState<ReportsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchReportsSummary(dateFrom, dateTo)
      setData(result.data)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // The fetch/mapping/error-parsing logic lives in fetchReportsSummary (a
  // plain async function, not a closure over setState) on purpose: the
  // react-hooks/set-state-in-effect rule flags any effect that calls an
  // outer function which sets state, so state updates are handled directly
  // here instead. `cancelled` guards against a stale response from a
  // superseded date range landing after a newer request already resolved.
  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchReportsSummary(dateFrom, dateTo)
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

  return { data, isLoading, error, refetch }
}
