import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import type { TicketStatus } from '../schemas'
import { parseRpcError } from '@/core/utils/parseRpcError'

const VALID_TRANSITIONS: Record<string, string[]> = {
  abierto: ['en_proceso'],
  en_proceso: ['resuelto', 'abierto'],
  resuelto: ['reabierto'],
  reabierto: ['en_proceso'],
}

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

interface UseUpdateTicketStatusResult {
  execute: (ticketId: string, currentStatus: TicketStatus, newStatus: TicketStatus) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useUpdateTicketStatus(): UseUpdateTicketStatusResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (ticketId: string, currentStatus: TicketStatus, newStatus: TicketStatus): Promise<boolean> => {
    if (!canTransition(currentStatus, newStatus)) {
      setError('Transición de estado no permitida.')
      return false
    }

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
