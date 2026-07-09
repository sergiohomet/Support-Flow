import { useEffect, useState } from 'react'
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

export function useReportsTicketsByCategory(
  dateFrom: string,
  dateTo: string
): UseReportsTicketsByCategoryResult {
  const [data, setData] = useState<TicketsByCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTicketsByCategory = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'admin_get_reports_tickets_by_category',
        { p_date_from: dateFrom, p_date_to: dateTo }
      )

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (rpcData as Array<Record<string, unknown>>) ?? []
      setData(rows.map((row) => mapTicketsByCategory(row as Parameters<typeof mapTicketsByCategory>[0])))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchTicketsByCategory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  return { data, isLoading, error, refetch: fetchTicketsByCategory }
}
