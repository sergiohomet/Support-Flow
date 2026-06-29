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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[480px] bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-1">SupportFlow</h1>
          <p className="text-sm text-gray-500">Gestión de incidencias técnicas</p>
        </div>
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
