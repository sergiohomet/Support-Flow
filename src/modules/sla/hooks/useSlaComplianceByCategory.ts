import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapSlaComplianceByCategory } from '../schemas'
import type { SlaComplianceByCategory } from '../schemas'

interface UseSlaComplianceByCategoryResult {
  data: SlaComplianceByCategory[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSlaComplianceByCategory(
  dateFrom: string,
  dateTo: string
): UseSlaComplianceByCategoryResult {
  const [data, setData] = useState<SlaComplianceByCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompliance = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'admin_get_sla_compliance_by_category',
        { p_date_from: dateFrom, p_date_to: dateTo }
      )

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (rpcData as Array<Record<string, unknown>>) ?? []
      setData(rows.map((row) => mapSlaComplianceByCategory(row as Parameters<typeof mapSlaComplianceByCategory>[0])))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchCompliance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  return { data, isLoading, error, refetch: fetchCompliance }
}
