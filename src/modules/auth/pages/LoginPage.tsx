import React from 'react'
import { LoginForm } from '../components/LoginForm'
import { useLogin } from '../hooks/useLogin'

export function LoginPage(): React.ReactElement {
  const { execute, isLoading, error } = useLogin()

  const handleSubmit = async (data: { email: string; password: string }): Promise<void> => {
    await execute(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Iniciar sesión</h1>
        <LoginForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}
