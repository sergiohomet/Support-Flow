import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import { mapAuthError } from '../utils/authErrors'
import type { AuthUser } from '@/store/authSlice'

interface UseLoginInput {
  email: string
  password: string
}

interface UseLoginResult {
  execute: (data: UseLoginInput) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useLogin(): UseLoginResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setUser = useStore((s) => s.setUser)

  const execute = async ({ email, password }: UseLoginInput): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(mapAuthError(authError))
        return
      }

      const { data: profileData, error: rpcError } = await supabase.rpc('get_my_profile')

      if (rpcError || !profileData?.[0]) {
        setError(mapAuthError(rpcError ?? new Error('Profile not found')))
        return
      }

      const p = profileData[0] as AuthUser
      setUser({ id: p.id, email: p.email, full_name: p.full_name, role: p.role })
    } finally {
      setIsLoading(false)
    }
  }

  return { execute, isLoading, error }
}
