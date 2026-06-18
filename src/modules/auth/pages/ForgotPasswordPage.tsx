import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { ForgotPasswordForm } from '../components/ForgotPasswordForm'
import { useForgotPassword } from '../hooks/useForgotPassword'

type Phase = 'request' | 'reset'

export function ForgotPasswordPage(): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('request')
  const { executeRequest, executeReset, isLoading, error, sent } = useForgotPassword()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setPhase('reset')
      }
    })
  }, [])

  const handleSubmitRequest = (email: string): void => {
    void executeRequest(email)
  }

  const handleSubmitReset = async (password: string): Promise<void> => {
    const ok = await executeReset(password)
    if (ok) {
      navigate('/login', { state: { message: 'Contraseña actualizada. Podés iniciar sesión.' } })
    }
  }

  const title = phase === 'reset' ? 'Nueva contraseña' : 'Recuperar contraseña'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h1>
        <ForgotPasswordForm
          phase={phase}
          onSubmitRequest={handleSubmitRequest}
          onSubmitReset={handleSubmitReset}
          isLoading={isLoading}
          error={error}
          sent={sent}
        />
      </div>
    </div>
  )
}
