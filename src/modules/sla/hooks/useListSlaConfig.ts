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

interface FetchResult {
  data: SlaConfigRow[]
  error: string | null
}

async function fetchSlaConfig(): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_sla_config')

  if (rpcError) {
    return { data: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  return { data: rows.map((row) => mapSlaConfig(row as Parameters<typeof mapSlaConfig>[0])), error: null }
}

export function useListSlaConfig(): UseListSlaConfigResult {
  const [data, setData] = useState<SlaConfigRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchSlaConfig()
      setData(result.data)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // See src/modules/reports/hooks/useReportsSummary.ts for why the fetch
  // logic is a plain function and the effect wraps it in a locally-defined
  // async runner instead of calling it directly —
  // react-hooks/set-state-in-effect flags any effect whose top level calls
  // an outer function (or sets state directly at its top level) that
  // updates state.
  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchSlaConfig()
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
  }, [])

  return { data, isLoading, error, refetch }
}
