import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapAtRiskTicket } from '../schemas'
import type { AtRiskTicket } from '../schemas'

interface UseSlaAtRiskTicketsResult {
  data: AtRiskTicket[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSlaAtRiskTickets(limit = 10): UseSlaAtRiskTicketsResult {
  const [data, setData] = useState<AtRiskTicket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAtRiskTickets = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_sla_at_risk_tickets', {
        p_limit: limit,
      })

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (rpcData as Array<Record<string, unknown>>) ?? []
      setData(rows.map((row) => mapAtRiskTicket(row as Parameters<typeof mapAtRiskTicket>[0])))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchAtRiskTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  return { data, isLoading, error, refetch: fetchAtRiskTickets }
}
