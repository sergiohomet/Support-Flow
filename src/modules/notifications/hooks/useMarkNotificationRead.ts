import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseMarkNotificationReadResult {
  execute: (notificationId: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useMarkNotificationRead(): UseMarkNotificationReadResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (notificationId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: rpcError } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
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
