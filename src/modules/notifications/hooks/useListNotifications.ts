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

interface FetchResult {
  data: NotificationRow[]
  error: string | null
}

async function fetchNotifications(filter: NotificationFilter): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_notifications', {
    p_filter: filter,
  })

  if (rpcError) {
    return { data: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  return {
    data: rows.map((row) => mapNotification(row as Parameters<typeof mapNotification>[0])),
    error: null,
  }
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

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchNotifications(filter)
      setRawData(result.data)
      setError(result.error)
    } finally {
      setIsLoading(false)
    }
  }

  // The fetch/mapping/error-parsing logic lives in fetchNotifications (a
  // plain async function, not a closure over setState) on purpose: the
  // react-hooks/set-state-in-effect rule flags any effect that calls an
  // outer function which sets state, so state updates are handled directly
  // here instead. `cancelled` guards against a stale response from a
  // superseded filter landing after a newer request already resolved.
  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchNotifications(filter)
        if (cancelled) return
        setRawData(result.data)
        setError(result.error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [filter])

  const markLocallyRead = (notificationId: string): void => {
    setLocallyReadIds((prev) => new Set(prev).add(notificationId))
  }

  const data = rawData.map((notification) =>
    locallyReadIds.has(notification.id) ? { ...notification, isRead: true } : notification
  )

  return { data, isLoading, error, refetch, markLocallyRead }
}
