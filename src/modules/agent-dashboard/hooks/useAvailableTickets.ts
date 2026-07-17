import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapAgentDashboardTicket } from '../schemas'
import type { AgentDashboardTicket } from '../schemas'

interface UseAvailableTicketsResult {
  tickets: AgentDashboardTicket[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  claim: (ticketId: string) => Promise<boolean>
  claimError: string | null
}

interface FetchResult {
  tickets: AgentDashboardTicket[]
  error: string | null
}

async function fetchAvailableTickets(categoryId: string): Promise<FetchResult> {
  const { data, error: rpcError } = await supabase.rpc('get_tickets', {
    p_status: 'abierto',
    p_category_id: categoryId,
    p_only_unassigned: true,
    p_page_size: 50,
  })

  if (rpcError) {
    return { tickets: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (data as Array<Record<string, unknown>>) ?? []
  return {
    tickets: rows.map((row) =>
      mapAgentDashboardTicket(row as Parameters<typeof mapAgentDashboardTicket>[0])
    ),
    error: null,
  }
}

// Los agentes sin categoría asignada (categoryId === null) intencionalmente
// nunca consultan — una llamada a get_tickets sin acotar por categoría
// sería engañosa (un agente podría "ver" tickets fuera de su competencia).
// La UI es responsable de mostrar un estado vacío distintivo de "sin
// categoría asignada".
export function useAvailableTickets(
  categoryId: string | null,
  agentId: string | null
): UseAvailableTicketsResult {
  const [tickets, setTickets] = useState<AgentDashboardTicket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)

  // Rastreamos el refetch más reciente a través de los renders para que el
  // efecto de realtime pueda llamarlo sin volver a suscribirse cada vez que
  // cambia la identidad de la función.
  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    if (!categoryId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchAvailableTickets(categoryId)
      setTickets(result.tickets)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  // Ver src/modules/sla/hooks/useSlaAtRiskTickets.ts para entender por qué
  // la lógica de fetch es una función plana y el efecto la envuelve en un
  // runner async definido localmente en lugar de llamarla directamente —
  // react-hooks/set-state-in-effect marca cualquier efecto cuyo nivel
  // superior llame a una función externa (o setee estado directamente en
  // su nivel superior) que actualice estado.
  useEffect(() => {
    if (!categoryId) return
    const currentCategoryId = categoryId

    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchAvailableTickets(currentCategoryId)
        if (cancelled) return
        setTickets(result.tickets)
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
  }, [categoryId])

  useEffect(() => {
    refetchRef.current = refetch
  })

  // Refleja el guard de "sin categoría asignada" de arriba: sin categoryId
  // no hay query ni tampoco suscripción.
  useEffect(() => {
    if (!categoryId) return
    const currentCategoryId = categoryId

    const channel = supabase
      .channel(`available-tickets-${currentCategoryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `category_id=eq.${currentCategoryId}`,
        },
        () => {
          void refetchRef.current?.()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `category_id=eq.${currentCategoryId}`,
        },
        () => {
          void refetchRef.current?.()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [categoryId])

  const claim = async (ticketId: string): Promise<boolean> => {
    if (!agentId) return false
    setClaimError(null)
    const { error: rpcError } = await supabase.rpc('assign_ticket', {
      p_ticket_id: ticketId,
      p_agent_id: agentId,
    })

    if (rpcError) {
      setClaimError(parseRpcError(rpcError.message))
      return false
    }

    await refetch()
    return true
  }

  return { tickets, isLoading, error, refetch, claim, claimError }
}
