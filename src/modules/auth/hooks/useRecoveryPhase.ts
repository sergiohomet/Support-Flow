import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'

export type RecoveryPhase = 'request' | 'reset'

async function hasRecoverySession(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user != null
}

// Starts on 'request' and flips to 'reset' if the user already has a
// recovery session (arrived via email link) or once Supabase fires
// PASSWORD_RECOVERY while processing the URL token.
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
