import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseUpdateCategoryResult {
  execute: (id: string, name: string, description?: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useUpdateCategory(): UseUpdateCategoryResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (id: string, name: string, description?: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('admin_update_category', {
        p_id: id,
        p_name: name,
        p_description: description,
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
