import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { mapAuthError } from '../utils/authErrors'

interface UseForgotPasswordResult {
  executeRequest: (email: string) => Promise<void>
  executeReset: (password: string) => Promise<boolean>
  isLoading: boolean
  error: string | null
  sent: boolean
}

export function useForgotPassword(): UseForgotPasswordResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const executeRequest = async (email: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      })

      if (supabaseError) {
        const msg = supabaseError.message ?? ''
        const isRateLimit =
          msg.includes('rate limit') ||
          msg.includes('429') ||
          msg.includes('over_email') ||
          msg.includes('too_many_requests')
        if (isRateLimit) {
          setError(mapAuthError(supabaseError))
          return
        }
        // Non-rate-limit errors (including user not found) → silent success (anti-enumeration)
      }

      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  const executeReset = async (password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: supabaseError } = await supabase.auth.updateUser({ password })

      if (supabaseError) {
        setError(mapAuthError(supabaseError))
        return false
      }

      await supabase.auth.signOut()
      return true
    } finally {
      setIsLoading(false)
    }
  }

  return { executeRequest, executeReset, isLoading, error, sent }
}
