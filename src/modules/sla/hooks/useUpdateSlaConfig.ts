import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseUpdateSlaConfigResult {
  execute: (categoryId: string, maxResolutionHours: number, escalationEnabled: boolean) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useUpdateSlaConfig(): UseUpdateSlaConfigResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (
    categoryId: string,
    maxResolutionHours: number,
    escalationEnabled: boolean
  ): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('admin_update_sla_config', {
        p_category_id: categoryId,
        p_max_resolution_hours: maxResolutionHours,
        p_escalation_enabled: escalationEnabled,
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
