import { useState } from 'react'
import { PasswordInput } from './PasswordInput'
import { forgotPasswordRequestSchema, resetPasswordSchema } from '../schemas'
import { useValidatedSubmit } from '@/core/hooks/useValidatedSubmit'

type ForgotPasswordPhase = 'request' | 'reset'

interface ForgotPasswordFormProps {
  phase: ForgotPasswordPhase
  onSubmitRequest: (email: string) => void
  onSubmitReset: (password: string) => void
  isLoading: boolean
  error: string | null
  sent: boolean
}

export function ForgotPasswordForm({
  phase,
  onSubmitRequest,
  onSubmitReset,
  isLoading,
  error,
  sent,
}: ForgotPasswordFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Este componente comparte dos fases; los hooks deben llamarse incondicionalmente,
  // por eso ambos validadores se configuran acá y más abajo se usa el que corresponda.
  const requestValidator = useValidatedSubmit(forgotPasswordRequestSchema, (data) =>
    onSubmitRequest(data.email),
  )
  const resetValidator = useValidatedSubmit(resetPasswordSchema, (data) =>
    onSubmitReset(data.password),
  )

  if (phase === 'request') {
    if (sent) {
      return (
        <p role="status" className="text-sm text-gray-700">
          Te enviamos un enlace de recuperación al email.
        </p>
      )
    }

    const emailError = requestValidator.fieldErrors.email

    const handleRequestSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault()
      requestValidator.submit({ email: email.trim() })
    }

    return (
      <form onSubmit={handleRequestSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            disabled={isLoading}
            placeholder="tu@email.com"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
            className={[
              'rounded-md border px-3 py-2 text-sm outline-none',
              'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'disabled:opacity-50',
              emailError ? 'border-red-500' : 'border-gray-300',
            ].join(' ')}
          />
          {emailError && (
            <p id="email-error" className="text-sm text-red-600">
              {emailError}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>
    )
  }

  // phase === 'reset'
  const handleResetSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    resetValidator.submit({ password, confirm_password: confirmPassword })
  }

  return (
    <form onSubmit={handleResetSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Nueva contraseña
        </label>
        <PasswordInput
          id="password"
          name="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={resetValidator.fieldErrors.password}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm_password" className="text-sm font-medium text-gray-700">
          Confirmar contraseña
        </label>
        <PasswordInput
          id="confirm_password"
          name="confirm_password"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
          placeholder="Repetí tu contraseña"
          error={resetValidator.fieldErrors.confirm_password}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Guardando...' : 'Guardar nueva contraseña'}
      </button>
    </form>
  )
}
