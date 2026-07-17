import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { TicketFilters } from '@/store/ticketsSlice'
import type { TicketListItem } from '../schemas'

interface UseTicketListResult {
  isFetching: boolean
  error: string | null
  fetch: () => Promise<void>
}

interface FetchResult {
  tickets: TicketListItem[]
  totalCount: number
  error: string | null
}

async function fetchTickets(filters: TicketFilters): Promise<FetchResult> {
  const { data, error: rpcError } = await supabase.rpc('get_tickets', {
    p_status: filters.status ?? undefined,
    p_priority: filters.priority ?? undefined,
    p_category_id: filters.categoryId ?? undefined,
    p_agent_id: filters.agentId ?? undefined,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  })

  if (rpcError) {
    return { tickets: [], totalCount: 0, error: rpcError.message }
  }

  const mapped: TicketListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIsActive: row.category_is_active,
    clientId: row.client_id,
    clientFullName: row.client_full_name,
    agentId: row.agent_id ?? null,
    agentFullName: row.agent_full_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    commentCount: row.comment_count,
  }))

  const totalCount: number = (data as Array<{ total_count?: number }>)?.[0]?.total_count ?? 0
  return { tickets: mapped, totalCount, error: null }
}

// `enabled` le permite a quien invoca condicionar el auto-fetch a su propia condición de
// "hay algún filtro activo" (TicketListPage solo quiere consultar una vez que el usuario
// seleccionó una pestaña de estado o escribió un término de búsqueda). El hook vuelve a hacer fetch
// cada vez que cambian `filters.status`/`filters.page` en el store — esos son
// los únicos dos campos que la UI de TicketListPage realmente modifica hoy en día.
export function useTicketList(enabled = false): UseTicketListResult {
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setTickets = useStore((s) => s.setTickets)
  const status = useStore((s) => s.filters.status)
  const page = useStore((s) => s.filters.page)

  // Guarda la referencia al fetch más reciente entre renders para que el efecto de realtime pueda
  // invocarlo sin volver a suscribirse cada vez que cambia la identidad de la función.
  const fetchRef = useRef<() => Promise<void>>(undefined)

  const fetch = async (): Promise<void> => {
    setIsFetching(true)
    setError(null)
    try {
      const result = await fetchTickets(useStore.getState().filters)
      if (result.error) {
        setError(result.error)
        return
      }
      setTickets(result.tickets, result.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsFetching(false)
    }
  }

  // Ver useReportsSummary.ts (src/modules/reports/hooks) para entender por qué la lógica
  // de fetch es una función simple y el efecto la envuelve en un runner asíncrono
  // definido localmente en lugar de llamarla directamente — react-hooks/set-state-in-effect
  // marca cualquier efecto cuyo nivel superior llame a una función externa (o actualice el estado
  // directamente en su nivel superior) que termine actualizando el estado.
  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function run(): Promise<void> {
      setIsFetching(true)
      setError(null)
      try {
        const result = await fetchTickets(useStore.getState().filters)
        if (cancelled) return
        if (result.error) {
          setError(result.error)
          return
        }
        setTickets(result.tickets, result.totalCount)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [status, page, enabled, setTickets])

  useEffect(() => {
    fetchRef.current = fetch
  })

  // Acá no hay ningún filtro del lado del cliente — una fila que coincida podría pertenecer a cualquier página o
  // combinación de filtros, así que nos suscribimos sin filtrar y dejamos que `fetch()` lea
  // los filtros vigentes desde el store (ver fetchTickets/useStore.getState()
  // arriba). Solo está activo mientras `enabled` sea true, replicando el efecto de auto-fetch.
  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('tickets-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        () => {
          void fetchRef.current?.()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        () => {
          void fetchRef.current?.()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled])

  return { isFetching, error, fetch }
}
