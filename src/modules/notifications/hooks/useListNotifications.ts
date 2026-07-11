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
  markLocallyRead: (notificationId: string) => void
}

export function useListNotifications(filter: NotificationFilter): UseListNotificationsResult {
  const [rawData, setRawData] = useState<NotificationRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Tracks ids marked read during this session so the card can flip to "read"
  // immediately on click, without waiting for a refetch — the list is only
  // refetched explicitly (e.g. after "Marcar todas como leídas"), so this
  // local override is the simplest way to reflect the optimistic read state
  // on top of whatever the last fetch returned.
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set())

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
      setRawData(rows.map((row) => mapNotification(row as Parameters<typeof mapNotification>[0])))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchNotifications()
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const markLocallyRead = (notificationId: string): void => {
    setLocallyReadIds((prev) => new Set(prev).add(notificationId))
  }

  const data = rawData.map((notification) =>
    locallyReadIds.has(notification.id) ? { ...notification, isRead: true } : notification
  )

  return { data, isLoading, error, refetch: fetchNotifications, markLocallyRead }
}
