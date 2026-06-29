import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PasswordInput } from './PasswordInput'

interface LoginFormData {
  email: string
  password: string
}

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void
  isLoading: boolean
  error: string | null
}

interface FieldErrors {
  email?: string
  password?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function LoginForm({
  onSubmit,
  isLoading,
  error,
}: LoginFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}

    if (!email.trim()) {
      errors.email = 'El email es requerido.'
    } else if (!isValidEmail(email)) {
      errors.email = 'Ingresá un email válido.'
    }
    if (!password) {
      errors.password = 'La contraseña es requerida.'
    }

    return errors
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) return

    onSubmit({ email: email.trim(), password })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <div className="relative">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">
            mail
          </span>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            disabled={isLoading}
            placeholder="agente@empresa.com"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={[
              'w-full h-12 pl-10 pr-3 rounded border text-sm outline-none',
              'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'disabled:opacity-50',
              fieldErrors.email ? 'border-red-500' : 'border-gray-300',
            ].join(' ')}
          />
        </div>
        {fieldErrors.email && (
          <p id="email-error" className="text-sm text-red-600">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <PasswordInput
          id="password"
          name="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="current-password"
          error={fieldErrors.password}
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
        className="w-full h-12 rounded bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-1"
      >
        {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
      </button>

      <div className="flex flex-col gap-1 text-sm text-center text-gray-600">
        <Link to="/forgot-password" className="text-blue-600 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <span>
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Registrate
          </Link>
        </span>
      </div>
    </form>
  )
}
