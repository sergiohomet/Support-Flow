import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import type { CreateUserInput } from '../schemas'

interface UseCreateUserResult {
  execute: (input: CreateUserInput) => Promise<boolean>
  isLoading: boolean
  error: string | null
}

export function useCreateUser(): UseCreateUserResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (input: CreateUserInput): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-user', {
        body: input,
      })

      if (invokeError) {
        setError(invokeError.message)
        return false
      }

      const response = data as Record<string, unknown> | null

      if (response?.error) {
        setError(response.error as string)
        return false
      }

      return true
    } finally {
      setIsLoading(false)
    }
  }

  return { execute, isLoading, error }
}
