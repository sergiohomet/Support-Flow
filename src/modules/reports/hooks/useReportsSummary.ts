import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapReportsSummary } from '../schemas'
import type { ReportsSummary } from '../schemas'

interface UseReportsSummaryResult {
  data: ReportsSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface FetchResult {
  data: ReportsSummary | null
  error: string | null
}

async function fetchReportsSummary(dateFrom: string, dateTo: string): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_reports_summary', {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (rpcError) {
    return { data: null, error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  const row = rows[0]
  return { data: row ? mapReportsSummary(row as Parameters<typeof mapReportsSummary>[0]) : null, error: null }
}

export function useReportsSummary(dateFrom: string, dateTo: string): UseReportsSummaryResult {
  const [data, setData] = useState<ReportsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rastrea el refetch más reciente entre renders para que el efecto de
  // tiempo real pueda invocarlo sin volver a suscribirse cada vez que cambia
  // la identidad de la función.
  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchReportsSummary(dateFrom, dateTo)
      setData(result.data)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // La lógica de fetch/mapeo/parseo de errores vive en fetchReportsSummary
  // (una función asíncrona plana, no un closure sobre setState) a propósito:
  // la regla react-hooks/set-state-in-effect marca cualquier efecto que
  // llame a una función externa que setee estado, así que las
  // actualizaciones de estado se manejan directamente acá. `cancelled` evita
  // que una respuesta obsoleta de un rango de fechas superado llegue después
  // de que una petición más nueva ya se haya resuelto.
  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchReportsSummary(dateFrom, dateTo)
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

  // Este RPC es solo para administradores y autoriza del lado del servidor
  // (SECURITY DEFINER), así que acá no hay ningún filtro del lado del
  // cliente que aplicar — la suscripción es solo una señal de "algo cambió,
  // refetch". Se suscribe una sola vez durante todo el ciclo de vida del
  // hook, independientemente de dateFrom/dateTo.
  useEffect(() => {
    const channel = supabase
      .channel('reports-summary')
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

  return { data, isLoading, error, refetch }
}
