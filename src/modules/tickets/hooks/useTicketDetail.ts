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
  fetch: (ticketId: string) => Promise<void>
}

export function useTicketDetail(): UseTicketDetailResult {
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUserId = useStore((s) => s.user?.id ?? null)

  // Track latest ticketId across renders so the realtime effect can refetch
  // without re-subscribing every time fetch() identity changes.
  const fetchRef = useRef<(ticketId: string) => Promise<void>>(undefined)

  const fetch = async (ticketId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const [detailResult, commentsResult, statusLogResult] = await Promise.all([
        supabase.rpc('get_ticket_detail', { p_ticket_id: ticketId }),
        supabase.rpc('get_ticket_comments', { p_ticket_id: ticketId }),
        supabase.rpc('get_ticket_status_log', { p_ticket_id: ticketId }),
      ])

      if (detailResult.error) {
        setError(detailResult.error.message)
        return
      }
      if (commentsResult.error) {
        setError(commentsResult.error.message)
        return
      }
      if (statusLogResult.error) {
        setError(statusLogResult.error.message)
        return
      }

      const row = detailResult.data?.[0]
      if (!row) {
        setError('Ticket not found or access denied.')
        return
      }

      setTicket({
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
      })

      setComments(
        (commentsResult.data ?? []).map((c) => ({
          id: c.id,
          ticketId: c.ticket_id,
          userId: c.user_id,
          userFullName: c.user_full_name,
          content: c.content,
          createdAt: c.created_at,
        }))
      )

      setStatusLog(
        (statusLogResult.data ?? []).map((s) => ({
          id: s.id,
          ticketId: s.ticket_id,
          fromStatus: s.from_status ?? null,
          toStatus: s.to_status,
          changedBy: s.changed_by,
          changedByFullName: s.changed_by_full_name,
          changedAt: s.changed_at,
        }))
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRef.current = fetch
  })

  useEffect(() => {
    const ticketId = ticket?.id
    if (!ticketId) return

    const channel = supabase
      .channel(`ticket-comments-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: { new: { user_id: string } }) => {
          // The current user's own inserts already trigger a refetch via
          // handleAddComment in TicketDetailPage — skip here to avoid a
          // redundant back-to-back refetch.
          if (payload.new.user_id === currentUserId) return
          void fetchRef.current?.(ticketId)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [ticket?.id, currentUserId])

  return { ticket, comments, statusLog, isLoading, error, fetch }
}
