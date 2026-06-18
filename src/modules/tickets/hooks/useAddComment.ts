import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import type { TicketComment } from '../schemas'
import { parseRpcError } from '../utils/parseRpcError'

interface UseAddCommentResult {
  execute: (ticketId: string, content: string) => Promise<TicketComment | null>
  isLoading: boolean
  error: string | null
}

export function useAddComment(): UseAddCommentResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (ticketId: string, content: string): Promise<TicketComment | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('add_ticket_comment', {
        p_ticket_id: ticketId,
        p_content: content,
      })

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return null
      }

      const row = (data as Array<Record<string, unknown>>)?.[0]
      if (!row) {
        setError('Error al agregar el comentario. Intentá de nuevo.')
        return null
      }

      return {
        id: row.id as string,
        ticketId: row.ticket_id as string,
        userId: row.user_id as string,
        userFullName: row.user_full_name as string,
        content: row.content as string,
        createdAt: row.created_at as string,
      }
    } finally {
      setIsLoading(false)
    }
  }

  return { execute, isLoading, error }
}
