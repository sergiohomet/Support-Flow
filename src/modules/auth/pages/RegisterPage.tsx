import React from 'react'
import { RegisterForm } from '../components/RegisterForm'
import { useRegister } from '../hooks/useRegister'

export function RegisterPage(): React.ReactElement {
  const { execute, isLoading, error, success } = useRegister()

  const handleSubmit = (data: {
    full_name: string
    email: string
    password: string
    confirm_password: string
  }): void => {
    const { confirm_password: _dropped, ...payload } = data
    void execute(payload)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Crear cuenta</h1>
        <RegisterForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          success={success}
        />
      </div>
    </div>
  )
}
