import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
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
  // Rastrea los ids marcados como leídos durante esta sesión para que la
  // tarjeta pase a "leída" de inmediato al hacer clic, sin esperar un
  // refetch — la lista solo se refetchea explícitamente (p. ej. después de
  // "Marcar todas como leídas"), así que este override local es la forma más
  // simple de reflejar el estado optimista de lectura sobre lo que haya
  // devuelto el último fetch.
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set())
  const currentUserId = useStore((s) => s.user?.id ?? null)

  // Rastrea el refetch más reciente entre renders para que el efecto de
  // tiempo real pueda invocarlo sin volver a suscribirse cada vez que cambia
  // la identidad de la función.
  const refetchRef = useRef<() => Promise<void>>(undefined)

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

  // La lógica de fetch/mapeo/parseo de errores vive en fetchNotifications
  // (una función asíncrona plana, no un closure sobre setState) a propósito:
  // la regla react-hooks/set-state-in-effect marca cualquier efecto que
  // llame a una función externa que setee estado, así que las actualizaciones
  // de estado se manejan directamente acá. `cancelled` evita que una
  // respuesta obsoleta de un filtro superado llegue después de que una
  // petición más nueva ya se haya resuelto.
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

  useEffect(() => {
    refetchRef.current = refetch
  })

  // Solo se suscribe una vez que se conoce el id del usuario actual — sin id
  // de usuario no hay suscripción filtrada que crear.
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
          void refetchRef.current?.()
        }
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
    locallyReadIds.has(notification.id) ? { ...notification, isRead: true } : notification
  )

  return { data, isLoading, error, refetch, markLocallyRead }
}
