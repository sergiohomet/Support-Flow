import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { mapAuthError } from '../utils/authErrors'

interface UseRegisterInput {
  email: string
  password: string
  full_name: string
}

interface UseRegisterResult {
  execute: (data: UseRegisterInput) => Promise<void>
  isLoading: boolean
  error: string | null
  success: boolean
}

export function useRegister(): UseRegisterResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const execute = async ({ email, password, full_name }: UseRegisterInput): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: supabaseError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name },
        },
      })

      if (supabaseError) {
        setError(mapAuthError(supabaseError))
        return
      }

      setSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  return { execute, isLoading, error, success }
}
