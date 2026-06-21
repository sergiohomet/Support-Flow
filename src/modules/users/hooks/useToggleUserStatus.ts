import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseToggleUserStatusResult {
  execute: (userId: string, isActive: boolean) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useToggleUserStatus(): UseToggleUserStatusResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (userId: string, isActive: boolean): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('admin_toggle_user_status', {
        p_user_id: userId,
        p_is_active: isActive,
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
