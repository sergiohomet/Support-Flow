// Páginas
export { RegisterPage } from './pages/RegisterPage'
export { LoginPage } from './pages/LoginPage'
export { ForgotPasswordPage } from './pages/ForgotPasswordPage'

// Hooks (exportados por completitud — las páginas son la API pública principal)
export { useRegister } from './hooks/useRegister'
export { useLogin } from './hooks/useLogin'
export { useForgotPassword } from './hooks/useForgotPassword'

// Utilidades
export { mapAuthError } from './utils/authErrors'
