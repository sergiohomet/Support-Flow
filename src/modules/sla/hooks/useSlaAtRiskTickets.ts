import { useEffect, useRef, useState } from 'react'
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

interface FetchResult {
  data: AtRiskTicket[]
  error: string | null
}

async function fetchAtRiskTickets(limit: number): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_sla_at_risk_tickets', {
    p_limit: limit,
  })

  if (rpcError) {
    return { data: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  return { data: rows.map((row) => mapAtRiskTicket(row as Parameters<typeof mapAtRiskTicket>[0])), error: null }
}

export function useSlaAtRiskTickets(limit = 10): UseSlaAtRiskTicketsResult {
  const [data, setData] = useState<AtRiskTicket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guarda la referencia al refetch más reciente entre renders para que el efecto de realtime pueda
  // invocarlo sin volver a suscribirse cada vez que cambia la identidad de la función.
  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchAtRiskTickets(limit)
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
        const result = await fetchAtRiskTickets(limit)
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
  }, [limit])

  useEffect(() => {
    refetchRef.current = refetch
  })

  // Esta RPC es solo para administradores y autoriza del lado del servidor (SECURITY DEFINER), por lo que
  // no hay ningún filtro del lado del cliente que aplicar acá — la suscripción es simplemente
  // una señal de "algo cambió, volver a hacer fetch". Se suscribe una sola vez durante toda la
  // vida del hook, independientemente de `limit`.
  useEffect(() => {
    const channel = supabase
      .channel('sla-at-risk-tickets')
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
