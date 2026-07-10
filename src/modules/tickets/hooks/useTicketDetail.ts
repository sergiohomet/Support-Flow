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
    aiTriage: row.ai_triage ?? null,
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

// Auto-fetches whenever `ticketId` changes (see useReportsSummary.ts for why
// the fetch logic is a plain function and the effect wraps it in a locally
// declared async runner). The realtime subscription effect is unchanged —
// it keys on `ticket?.id` (the loaded ticket, not the route param), so it
// still only (re)subscribes once a ticket has actually loaded.
export function useTicketDetail(ticketId: string | undefined): UseTicketDetailResult {
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUserId = useStore((s) => s.user?.id ?? null)

  // Track the latest refetch across renders so the realtime effect can call
  // it without re-subscribing every time the function identity changes.
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
          // The current user's own inserts already trigger a refetch via
          // handleAddComment in TicketDetailPage — skip here to avoid a
          // redundant back-to-back refetch.
          if (payload.new.user_id === currentUserId) return
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
