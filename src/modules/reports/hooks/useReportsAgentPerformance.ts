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

export function useReportsAgentPerformance(
  dateFrom: string,
  dateTo: string
): UseReportsAgentPerformanceResult {
  const [data, setData] = useState<AgentPerformance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAgentPerformance = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'admin_get_reports_agent_performance',
        { p_date_from: dateFrom, p_date_to: dateTo }
      )

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (rpcData as Array<Record<string, unknown>>) ?? []
      setData(rows.map((row) => mapAgentPerformance(row as Parameters<typeof mapAgentPerformance>[0])))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchAgentPerformance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  return { data, isLoading, error, refetch: fetchAgentPerformance }
}
