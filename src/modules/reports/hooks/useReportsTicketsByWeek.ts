import { useEffect, useRef, useState } from 'react'
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

interface FetchResult {
  data: TicketsByWeek[]
  error: string | null
}

async function fetchTicketsByWeek(dateFrom: string, dateTo: string): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_reports_tickets_by_week', {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  })

  if (rpcError) {
    return { data: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  return { data: rows.map((row) => mapTicketsByWeek(row as Parameters<typeof mapTicketsByWeek>[0])), error: null }
}

export function useReportsTicketsByWeek(dateFrom: string, dateTo: string): UseReportsTicketsByWeekResult {
  const [data, setData] = useState<TicketsByWeek[]>([])
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
      const result = await fetchTicketsByWeek(dateFrom, dateTo)
      setData(result.data)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // Ver useReportsSummary.ts para entender por qué la lógica de fetch es una
  // función plana y el efecto la envuelve en un runner asíncrono definido
  // localmente en lugar de llamarla directamente — la regla
  // react-hooks/set-state-in-effect marca cualquier efecto cuyo nivel
  // superior llame a una función externa (o setee estado directamente en su
  // nivel superior) que actualice estado.
  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchTicketsByWeek(dateFrom, dateTo)
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
      .channel('reports-tickets-by-week')
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
