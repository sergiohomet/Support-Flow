import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapSlaDashboardSummary } from '../schemas'
import type { SlaDashboardSummary } from '../schemas'

interface UseSlaDashboardSummaryResult {
  data: SlaDashboardSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSlaDashboardSummary(dateFrom: string, dateTo: string): UseSlaDashboardSummaryResult {
  const [data, setData] = useState<SlaDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_sla_dashboard', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
      })

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (rpcData as Array<Record<string, unknown>>) ?? []
      const row = rows[0]
      setData(row ? mapSlaDashboardSummary(row as Parameters<typeof mapSlaDashboardSummary>[0]) : null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  return { data, isLoading, error, refetch: fetchSummary }
}
