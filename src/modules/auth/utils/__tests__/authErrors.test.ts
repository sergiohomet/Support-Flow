import { mapAuthError } from '../authErrors'

describe('mapAuthError', () => {
  it('maps "Invalid login credentials" to Spanish', () => {
    const err = new Error('Invalid login credentials')
    expect(mapAuthError(err)).toBe('Email o contraseña incorrectos')
  })

  it('maps "Email not confirmed" to Spanish', () => {
    const err = new Error('Email not confirmed')
    expect(mapAuthError(err)).toBe('Debés confirmar tu email antes de iniciar sesión')
  })

  it('maps "User already registered" to Spanish', () => {
    const err = new Error('User already registered')
    expect(mapAuthError(err)).toBe('Ya existe una cuenta con este email')
  })

  it('maps "email already" to Spanish', () => {
    const err = new Error('email already in use')
    expect(mapAuthError(err)).toBe('Ya existe una cuenta con este email')
  })

  it('maps "Password should be at least" to Spanish', () => {
    const err = new Error('Password should be at least 6 characters')
    expect(mapAuthError(err)).toBe('La contraseña debe tener al menos 8 caracteres')
  })

  it('maps "same_password" to Spanish', () => {
    const err = new Error('same_password')
    expect(mapAuthError(err)).toBe('La nueva contraseña debe ser diferente a la actual')
  })

  it('maps "Token has expired" to Spanish', () => {
    const err = new Error('Token has expired or is invalid')
    expect(mapAuthError(err)).toBe('El enlace expiró. Solicitá uno nuevo')
  })

  it('maps "too_many_requests" to Spanish', () => {
    const err = new Error('too_many_requests')
    expect(mapAuthError(err)).toBe('Demasiados intentos. Esperá unos minutos')
  })

  it('maps "Email rate limit exceeded" (Supabase 429) to Spanish', () => {
    const err = new Error('Email rate limit exceeded')
    expect(mapAuthError(err)).toBe('Demasiados intentos. Esperá unos minutos')
  })

  it('maps "over_email_send_rate_limit" (Supabase 429) to Spanish', () => {
    const err = new Error('over_email_send_rate_limit')
    expect(mapAuthError(err)).toBe('Demasiados intentos. Esperá unos minutos')
  })

  it('maps "rate limit" substring to Spanish', () => {
    const err = new Error('You have exceeded the rate limit for this endpoint')
    expect(mapAuthError(err)).toBe('Demasiados intentos. Esperá unos minutos')
  })

  it('maps "429" substring to Spanish', () => {
    const err = new Error('Request failed with status 429')
    expect(mapAuthError(err)).toBe('Demasiados intentos. Esperá unos minutos')
  })

  it('returns FALLBACK for unknown error message', () => {
    const err = new Error('some completely unknown error')
    expect(mapAuthError(err)).toBe('Ocurrió un error inesperado. Intentá nuevamente.')
  })

  it('returns FALLBACK for null input without throwing', () => {
    expect(mapAuthError(null)).toBe('Ocurrió un error inesperado. Intentá nuevamente.')
  })

  it('returns FALLBACK for undefined input without throwing', () => {
    expect(mapAuthError(undefined)).toBe('Ocurrió un error inesperado. Intentá nuevamente.')
  })

  it('maps a Supabase AuthError object (has .message) correctly', () => {
    // Supabase AuthError extends Error — simulate with a plain Error
    const supabaseAuthError = Object.assign(new Error('Invalid login credentials'), {
      status: 400,
      code: 'invalid_credentials',
    })
    expect(mapAuthError(supabaseAuthError)).toBe('Email o contraseña incorrectos')
  })
})
