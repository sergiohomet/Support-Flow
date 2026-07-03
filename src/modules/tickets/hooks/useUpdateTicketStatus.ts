import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import type { TicketStatus } from '../schemas'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseUpdateTicketStatusResult {
  execute: (ticketId: string, newStatus: TicketStatus) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useUpdateTicketStatus(): UseUpdateTicketStatusResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (ticketId: string, newStatus: TicketStatus): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('update_ticket_status', {
        p_ticket_id: ticketId,
        p_new_status: newStatus,
      })

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return false
      }

      return true
    } finally {
      setIsLoading(false)
    }
  }

  return { execute, isLoading, error }
}
