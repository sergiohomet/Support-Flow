import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapAgentPerformance } from '../schemas'
import type { AgentPerformance } from '../schemas'

interface UseReportsAgentPerformanceResult {
  data: AgentPerformance[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface FetchResult {
  data: AgentPerformance[]
  error: string | null
}

async function fetchAgentPerformance(dateFrom: string, dateTo: string): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_reports_agent_performance', {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (rpcError) {
    return { data: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  return { data: rows.map((row) => mapAgentPerformance(row as Parameters<typeof mapAgentPerformance>[0])), error: null }
}

export function useReportsAgentPerformance(
  dateFrom: string,
  dateTo: string
): UseReportsAgentPerformanceResult {
  const [data, setData] = useState<AgentPerformance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchAgentPerformance(dateFrom, dateTo)
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
        const result = await fetchAgentPerformance(dateFrom, dateTo)
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
