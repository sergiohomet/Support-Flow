import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapSlaConfig } from '../schemas'
import type { SlaConfigRow } from '../schemas'

interface UseListSlaConfigResult {
  data: SlaConfigRow[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useListSlaConfig(): UseListSlaConfigResult {
  const [data, setData] = useState<SlaConfigRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSlaConfig = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_sla_config')

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (rpcData as Array<Record<string, unknown>>) ?? []
      setData(rows.map((row) => mapSlaConfig(row as Parameters<typeof mapSlaConfig>[0])))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchSlaConfig()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, isLoading, error, refetch: fetchSlaConfig }
}
