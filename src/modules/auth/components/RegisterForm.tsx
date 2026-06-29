import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PasswordInput } from './PasswordInput'

interface RegisterFormData {
  full_name: string
  email: string
  password: string
  confirm_password: string
}

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void
  isLoading: boolean
  error: string | null
  success: boolean
}

interface FieldErrors {
  full_name?: string
  email?: string
  password?: string
  confirm_password?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function RegisterForm({
  onSubmit,
  isLoading,
  error,
  success,
}: RegisterFormProps): React.JSX.Element {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  if (success) {
    return (
      <p role="status" className="text-green-700 text-sm font-medium">
        Revisá tu email para confirmar tu cuenta.
      </p>
    )
  }

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.full_name = 'El nombre debe tener al menos 2 caracteres.'
    }
    if (!email.trim()) {
      errors.email = 'El email es requerido.'
    } else if (!isValidEmail(email)) {
      errors.email = 'Ingresá un email válido.'
    }
    if (!password) {
      errors.password = 'La contraseña es requerida.'
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres.'
    }
    if (!confirmPassword) {
      errors.confirm_password = 'Confirmá tu contraseña.'
    } else if (confirmPassword !== password) {
      errors.confirm_password = 'Las contraseñas no coinciden.'
    }

    return errors
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) return

    onSubmit({
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      confirm_password: confirmPassword,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="full_name" className="text-sm font-medium text-gray-700">
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
          disabled={isLoading}
          aria-invalid={!!fieldErrors.full_name}
          aria-describedby={fieldErrors.full_name ? 'full_name-error' : undefined}
          className={[
            'rounded-md border px-3 py-2 text-sm outline-none',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:opacity-50',
            fieldErrors.full_name ? 'border-red-500' : 'border-gray-300',
          ].join(' ')}
        />
        {fieldErrors.full_name && (
          <p id="full_name-error" className="text-sm text-red-600">
            {fieldErrors.full_name}
          </p>
        )}
      </div>

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
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          className={[
            'rounded-md border px-3 py-2 text-sm outline-none',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:opacity-50',
            fieldErrors.email ? 'border-red-500' : 'border-gray-300',
          ].join(' ')}
        />
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
          autoComplete="new-password"
          error={fieldErrors.password}
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
          error={fieldErrors.confirm_password}
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
        className="w-full h-12 rounded bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
      >
        {isLoading ? 'Registrando...' : 'Crear cuenta'}
      </button>

      <p className="text-sm text-center text-gray-600">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </form>
  )
}
