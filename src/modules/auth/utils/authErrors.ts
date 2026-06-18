const ERROR_MAP: [string, string][] = [
  ['Invalid login credentials', 'Email o contraseña incorrectos'],
  ['Email not confirmed', 'Debés confirmar tu email antes de iniciar sesión'],
  ['User already registered', 'Ya existe una cuenta con este email'],
  ['email already', 'Ya existe una cuenta con este email'],
  ['Password should be at least', 'La contraseña debe tener al menos 8 caracteres'],
  ['same_password', 'La nueva contraseña debe ser diferente a la actual'],
  ['Token has expired', 'El enlace expiró. Solicitá uno nuevo'],
  ['too_many_requests', 'Demasiados intentos. Esperá unos minutos'],
  ['Email rate limit exceeded', 'Demasiados intentos. Esperá unos minutos'],
  ['over_email_send_rate_limit', 'Demasiados intentos. Esperá unos minutos'],
  ['rate limit', 'Demasiados intentos. Esperá unos minutos'],
  ['429', 'Demasiados intentos. Esperá unos minutos'],
]

const FALLBACK = 'Ocurrió un error inesperado. Intentá nuevamente.'

export function mapAuthError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  for (const [key, spanish] of ERROR_MAP) {
    if (msg.includes(key)) return spanish
  }
  return FALLBACK
}
