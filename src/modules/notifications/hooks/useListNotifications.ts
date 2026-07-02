import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapNotification } from '../schemas'
import type { NotificationFilter, NotificationRow } from '../schemas'

interface UseListNotificationsResult {
  data: NotificationRow[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useListNotifications(filter: NotificationFilter): UseListNotificationsResult {
  const [data, setData] = useState<NotificationRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_notifications', {
        p_filter: filter,
      })

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (rpcData as Array<Record<string, unknown>>) ?? []
      setData(rows.map((row) => mapNotification(row as Parameters<typeof mapNotification>[0])))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchNotifications()
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, isLoading, error, refetch: fetchNotifications }
}
