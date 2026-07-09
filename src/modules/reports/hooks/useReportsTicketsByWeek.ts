import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapTicketsByWeek } from '../schemas'
import type { TicketsByWeek } from '../schemas'

interface UseReportsTicketsByWeekResult {
  data: TicketsByWeek[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useReportsTicketsByWeek(dateFrom: string, dateTo: string): UseReportsTicketsByWeekResult {
  const [data, setData] = useState<TicketsByWeek[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTicketsByWeek = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_reports_tickets_by_week', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
      })

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (rpcData as Array<Record<string, unknown>>) ?? []
      setData(rows.map((row) => mapTicketsByWeek(row as Parameters<typeof mapTicketsByWeek>[0])))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchTicketsByWeek()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  return { data, isLoading, error, refetch: fetchTicketsByWeek }
}
