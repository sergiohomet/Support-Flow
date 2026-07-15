import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'

interface UseHasUnreadNotificationsResult {
  hasUnread: boolean
  isLoading: boolean
}

async function fetchHasUnread(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_unread_notifications')
  if (error) return false
  return Boolean(data)
}

// Powers the sidebar badge. Re-asks the RPC (the source of truth) on every
// INSERT/UPDATE instead of computing the boolean client-side from partial
// event payloads — cheap call, and it stays correct regardless of what
// changed (e.g. mark-as-read UPDATEs).
export function useHasUnreadNotifications(): UseHasUnreadNotificationsResult {
  const [hasUnread, setHasUnread] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const currentUserId = useStore((s) => s.user?.id ?? null)

  // Track the latest refetch across renders so the realtime effect can call
  // it without re-subscribing every time the function identity changes.
  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const result = await fetchHasUnread()
      setHasUnread(result)
    } finally {
      setIsLoading(false)
    }
  }

  // See useTicketDetail.ts for why the fetch logic is a plain function and
  // the effect wraps it in a locally-defined async runner instead of calling
  // it directly — react-hooks/set-state-in-effect flags any effect whose top
  // level calls an outer function (or sets state directly) that updates
  // state. `cancelled` guards against a stale response landing after a
  // superseded user id already resolved.
  useEffect(() => {
    if (!currentUserId) return

    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      try {
        const result = await fetchHasUnread()
        if (cancelled) return
        setHasUnread(result)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [currentUserId])

  useEffect(() => {
    refetchRef.current = refetch
  })

  // Only subscribe once the current user id is known — no user id means no
  // filtered subscription to create.
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`has-unread-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void refetchRef.current?.()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void refetchRef.current?.()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUserId])

  return { hasUnread, isLoading }
}
