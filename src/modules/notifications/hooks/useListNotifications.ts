import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapNotification } from '../schemas'
import type { NotificationFilter, NotificationRow } from '../schemas'

const PAGE_SIZE = 20

interface UseListNotificationsResult {
  data: NotificationRow[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  markLocallyRead: (notificationId: string) => void
  page: number
  totalPages: number
  setPage: (page: number) => void
  totalCount: number
}

interface FetchResult {
  data: NotificationRow[]
  totalCount: number
  error: string | null
}

async function fetchNotifications(
  filter: NotificationFilter,
  page: number,
): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_notifications', {
    p_filter: filter,
    p_page: page,
    p_page_size: PAGE_SIZE,
  })

  if (rpcError) {
    return { data: [], totalCount: 0, error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  const totalCount =
    rows.length > 0 && typeof rows[0].total_count === 'number'
      ? rows[0].total_count
      : 0

  return {
    data: rows.map((row) => mapNotification(row as Parameters<typeof mapNotification>[0])),
    totalCount,
    error: null,
  }
}

export function useListNotifications(filter: NotificationFilter): UseListNotificationsResult {
  const [rawData, setRawData] = useState<NotificationRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set())
  const currentUserId = useStore((s) => s.user?.id ?? null)

  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchNotifications(filter, page)
      setRawData(result.data)
      setTotalCount(result.totalCount)
      setError(result.error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1)
  }, [filter])

  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchNotifications(filter, page)
        if (cancelled) return
        setRawData(result.data)
        setTotalCount(result.totalCount)
        setError(result.error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [filter, page])

  useEffect(() => {
    refetchRef.current = refetch
  })

  // Realtime INSERT subscription — new notifications go to page 1
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          setPage(1)
          void refetchRef.current?.()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUserId])

  const markLocallyRead = (notificationId: string): void => {
    setLocallyReadIds((prev) => new Set(prev).add(notificationId))
  }

  const data = rawData.map((notification) =>
    locallyReadIds.has(notification.id) ? { ...notification, isRead: true } : notification,
  )

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return { data, isLoading, error, refetch, markLocallyRead, page, totalPages, setPage, totalCount }
}
