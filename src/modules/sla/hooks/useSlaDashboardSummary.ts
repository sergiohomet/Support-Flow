import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapSlaDashboardSummary } from '../schemas'
import type { SlaDashboardSummary } from '../schemas'

interface UseSlaDashboardSummaryResult {
  data: SlaDashboardSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  resolvedPct: number
  escalatedPct: number
}

function computePct(count: number, totalTickets: number): number {
  return totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0
}

interface FetchResult {
  data: SlaDashboardSummary | null
  error: string | null
}

async function fetchSlaDashboardSummary(dateFrom: string, dateTo: string): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_sla_dashboard', {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (rpcError) {
    return { data: null, error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  const row = rows[0]
  return { data: row ? mapSlaDashboardSummary(row as Parameters<typeof mapSlaDashboardSummary>[0]) : null, error: null }
}

export function useSlaDashboardSummary(dateFrom: string, dateTo: string): UseSlaDashboardSummaryResult {
  const [data, setData] = useState<SlaDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guarda la referencia al refetch más reciente entre renders para que el efecto de realtime pueda
  // invocarlo sin volver a suscribirse cada vez que cambia la identidad de la función.
  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchSlaDashboardSummary(dateFrom, dateTo)
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
        const result = await fetchSlaDashboardSummary(dateFrom, dateTo)
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

  useEffect(() => {
    refetchRef.current = refetch
  })

  // Esta RPC es solo para administradores y autoriza del lado del servidor (SECURITY DEFINER), por lo que
  // no hay ningún filtro del lado del cliente que aplicar acá — la suscripción es simplemente
  // una señal de "algo cambió, volver a hacer fetch". Se suscribe una sola vez durante toda la
  // vida del hook, independientemente de dateFrom/dateTo.
  useEffect(() => {
    const channel = supabase
      .channel('sla-dashboard-summary')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        () => {
          void refetchRef.current?.()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        () => {
          void refetchRef.current?.()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const resolvedPct = useMemo(
    () => computePct(data?.resolvedInSla ?? 0, data?.totalTickets ?? 0),
    [data]
  )
  const escalatedPct = useMemo(
    () => computePct(data?.escalatedCount ?? 0, data?.totalTickets ?? 0),
    [data]
  )

  return { data, isLoading, error, refetch, resolvedPct, escalatedPct }
}
