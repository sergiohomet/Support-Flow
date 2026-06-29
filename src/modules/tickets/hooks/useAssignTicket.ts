import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseAssignTicketResult {
  execute: (ticketId: string, agentId: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useAssignTicket(): UseAssignTicketResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (ticketId: string, agentId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('assign_ticket', {
        p_ticket_id: ticketId,
        p_agent_id: agentId,
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
