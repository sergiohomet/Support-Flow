import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { AuthUser } from '@/store/authSlice'

async function loadProfile(): Promise<AuthUser | null> {
  const { data, error } = await supabase.rpc('get_my_profile')
  if (error || !data?.[0]) return null
  const p = data[0]
  if (p.is_active === false) {
    await supabase.auth.signOut()
    return null
  }
  return { id: p.id, email: p.email, full_name: p.full_name, role: p.role }
}

// Bootstraps auth state on app load: restores the session on mount, keeps
// the store in sync with Supabase auth events, and redirects to the
// password-recovery flow when Supabase fires PASSWORD_RECOVERY.
export function useAuthBootstrap(): void {
  const setUser = useStore((s) => s.setUser)
  const setAuthReady = useStore((s) => s.setAuthReady)
  const navigate = useNavigate()

  useEffect(() => {
    // Mount: handle page reload — load profile if a valid session exists
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          const profile = await loadProfile()
          setUser(profile)
        } else {
          setUser(null)
        }
      } finally {
        setAuthReady(true)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        const profile = await loadProfile()
        setUser(profile)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/forgot-password')
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setAuthReady, navigate])
}
