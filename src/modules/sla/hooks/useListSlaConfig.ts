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

  // Ver src/modules/reports/hooks/useReportsSummary.ts para entender por qué la lógica
  // de fetch es una función simple y el efecto la envuelve en un runner asíncrono
  // definido localmente en lugar de llamarla directamente —
  // react-hooks/set-state-in-effect marca cualquier efecto cuyo nivel superior llame
  // a una función externa (o actualice el estado directamente en su nivel superior) que
  // termine actualizando el estado.
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
