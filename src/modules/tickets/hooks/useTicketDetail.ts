import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { TicketDetail, TicketComment, StatusLogEntry } from '../schemas'

interface UseTicketDetailResult {
  ticket: TicketDetail | null
  comments: TicketComment[]
  statusLog: StatusLogEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface FetchResult {
  ticket: TicketDetail | null
  comments: TicketComment[]
  statusLog: StatusLogEntry[]
  error: string | null
}

async function fetchTicketDetail(ticketId: string): Promise<FetchResult> {
  const [detailResult, commentsResult, statusLogResult] = await Promise.all([
    supabase.rpc('get_ticket_detail', { p_ticket_id: ticketId }),
    supabase.rpc('get_ticket_comments', { p_ticket_id: ticketId }),
    supabase.rpc('get_ticket_status_log', { p_ticket_id: ticketId }),
  ])

  if (detailResult.error) {
    return { ticket: null, comments: [], statusLog: [], error: detailResult.error.message }
  }
  if (commentsResult.error) {
    return { ticket: null, comments: [], statusLog: [], error: commentsResult.error.message }
  }
  if (statusLogResult.error) {
    return { ticket: null, comments: [], statusLog: [], error: statusLogResult.error.message }
  }

  const row = detailResult.data?.[0]
  if (!row) {
    return { ticket: null, comments: [], statusLog: [], error: 'Ticket not found or access denied.' }
  }

  const ticket: TicketDetail = {
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
    aiTriage: (row.ai_triage as TicketDetail['aiTriage']) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    escalatedAt: row.escalated_at ?? null,
    slaHours: row.sla_hours ?? null,
  }

  const comments: TicketComment[] = (commentsResult.data ?? []).map((c) => ({
    id: c.id,
    ticketId: c.ticket_id,
    userId: c.user_id,
    userFullName: c.user_full_name,
    content: c.content,
    createdAt: c.created_at,
  }))

  const statusLog: StatusLogEntry[] = (statusLogResult.data ?? []).map((s) => ({
    id: s.id,
    ticketId: s.ticket_id,
    fromStatus: s.from_status ?? null,
    toStatus: s.to_status,
    changedBy: s.changed_by,
    changedByFullName: s.changed_by_full_name,
    changedAt: s.changed_at,
  }))

  return { ticket, comments, statusLog, error: null }
}

// Hace fetch automáticamente cada vez que cambia `ticketId` (ver useReportsSummary.ts para entender por qué
// la lógica de fetch es una función simple y el efecto la envuelve en un runner asíncrono
// declarado localmente). El efecto de suscripción en tiempo real no cambia —
// se basa en `ticket?.id` (el ticket ya cargado, no el parámetro de la ruta), por lo que
// solo se (vuelve a) suscribir una vez que un ticket efectivamente se cargó.
export function useTicketDetail(ticketId: string | undefined): UseTicketDetailResult {
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUserId = useStore((s) => s.user?.id ?? null)

  // Guarda la referencia al refetch más reciente entre renders para que el efecto de realtime pueda
  // invocarlo sin volver a suscribirse cada vez que cambia la identidad de la función.
  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    if (!ticketId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchTicketDetail(ticketId)
      setTicket(result.ticket)
      setComments(result.comments)
      setStatusLog(result.statusLog)
      setError(result.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!ticketId) return
    const currentTicketId = ticketId

    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchTicketDetail(currentTicketId)
        if (cancelled) return
        setTicket(result.ticket)
        setComments(result.comments)
        setStatusLog(result.statusLog)
        setError(result.error)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [ticketId])

  useEffect(() => {
    refetchRef.current = refetch
  })

  useEffect(() => {
    const currentTicketId = ticket?.id
    if (!currentTicketId) return

    const channel = supabase
      .channel(`ticket-comments-${currentTicketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${currentTicketId}`,
        },
        (payload: { new: { user_id: string } }) => {
          // Los inserts propios del usuario actual ya disparan un refetch mediante
          // handleAddComment en TicketDetailPage — se omite acá para evitar un
          // refetch redundante inmediatamente después de otro.
          if (payload.new.user_id === currentUserId) return
          void refetchRef.current?.()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${currentTicketId}`,
        },
        (payload: { new: { id: string } }) => {
          // El filtro a nivel de fila de arriba ya limita la entrega a este
          // ticket, pero se vuelve a chequear de forma defensiva (replicando la guarda de
          // usuario propio del handler de INSERT) por si la semántica del filtro cambia alguna vez.
          if (payload.new.id !== currentTicketId) return
          void refetchRef.current?.()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [ticket?.id, currentUserId])

  return { ticket, comments, statusLog, isLoading, error, refetch }
}
