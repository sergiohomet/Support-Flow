import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseUpdateUserSpecialtyResult {
  execute: (userId: string, categoryId: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useUpdateUserSpecialty(): UseUpdateUserSpecialtyResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (userId: string, categoryId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('admin_update_user_specialty', {
        p_user_id: userId,
        p_category_id: categoryId,
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
