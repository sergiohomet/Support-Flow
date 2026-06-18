import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import type { CreateTicketInput } from '../schemas'
import { parseRpcError } from '../utils/parseRpcError'

interface UseCreateTicketResult {
  execute: (input: CreateTicketInput) => Promise<string | null>
  isLoading: boolean
  error: string | null
}

export function useCreateTicket(): UseCreateTicketResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (input: CreateTicketInput): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('create_ticket', {
        p_title: input.title,
        p_description: input.description,
        p_category_id: input.categoryId,
        p_priority: input.priority,
      })

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return null
      }

      const row = (data as Array<{ id: string }>)?.[0]
      if (!row) {
        setError('Error al crear el ticket. Intentá de nuevo.')
        return null
      }

      return row.id
    } finally {
      setIsLoading(false)
    }
  }

  return { execute, isLoading, error }
}
