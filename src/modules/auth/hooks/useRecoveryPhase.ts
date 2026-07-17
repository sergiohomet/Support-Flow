import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'

export type RecoveryPhase = 'request' | 'reset'

async function hasRecoverySession(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user != null
}

// Arranca en 'request' y pasa a 'reset' si el usuario ya tiene una
// sesión de recuperación (llegó por el enlace del email) o cuando
// Supabase dispara PASSWORD_RECOVERY al procesar el token de la URL.
export function useRecoveryPhase(): RecoveryPhase {
  const [phase, setPhase] = useState<RecoveryPhase>('request')

  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      const hasSession = await hasRecoverySession()
      if (!cancelled && hasSession) setPhase('reset')
    }

    void run()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPhase('reset')
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return phase
}
