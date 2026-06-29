import React from 'react'
import { LoginForm } from '../components/LoginForm'
import { useLogin } from '../hooks/useLogin'

export function LoginPage(): React.ReactElement {
  const { execute, isLoading, error } = useLogin()

  const handleSubmit = async (data: { email: string; password: string }): Promise<void> => {
    await execute(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[480px] bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-1">SupportFlow</h1>
          <p className="text-sm text-gray-500">Enterprise Support Desk</p>
        </div>
        <LoginForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}
