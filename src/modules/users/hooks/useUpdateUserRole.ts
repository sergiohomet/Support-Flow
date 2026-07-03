import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import type { UserRole } from '../schemas'

interface UseUpdateUserRoleResult {
  execute: (userId: string, newRole: UserRole, categoryId?: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useUpdateUserRole(): UseUpdateUserRoleResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (userId: string, newRole: UserRole, categoryId?: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('admin_update_user_role', {
        p_user_id: userId,
        p_new_role: newRole,
        p_category_id: categoryId ?? undefined,
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
