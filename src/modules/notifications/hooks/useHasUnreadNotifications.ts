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

// Alimenta el badge de la barra lateral. Vuelve a consultar el RPC (la fuente
// de verdad) en cada INSERT/UPDATE en lugar de calcular el booleano en el
// cliente a partir de payloads parciales del evento — es una llamada barata,
// y se mantiene correcto sin importar qué cambió (p. ej. UPDATEs de
// marcar-como-leída).
export function useHasUnreadNotifications(): UseHasUnreadNotificationsResult {
  const [hasUnread, setHasUnread] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const currentUserId = useStore((s) => s.user?.id ?? null)

  // Rastrea el refetch más reciente entre renders para que el efecto de
  // tiempo real pueda invocarlo sin volver a suscribirse cada vez que cambia
  // la identidad de la función.
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

  // Ver useTicketDetail.ts para entender por qué la lógica de fetch es una
  // función plana y el efecto la envuelve en un runner asíncrono definido
  // localmente en lugar de llamarla directamente — la regla
  // react-hooks/set-state-in-effect marca cualquier efecto cuyo nivel
  // superior llame a una función externa (o setee estado directamente) que
  // actualice estado. `cancelled` evita que una respuesta obsoleta llegue
  // después de que un user id superado ya se haya resuelto.
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

  // Solo se suscribe una vez que se conoce el id del usuario actual — sin id
  // de usuario no hay suscripción filtrada que crear.
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
