// Pages
export { RegisterPage } from './pages/RegisterPage'
export { LoginPage } from './pages/LoginPage'
export { ForgotPasswordPage } from './pages/ForgotPasswordPage'

// Hooks (exported for completeness — pages are the primary public API)
export { useRegister } from './hooks/useRegister'
export { useLogin } from './hooks/useLogin'
export { useForgotPassword } from './hooks/useForgotPassword'

// Utils
export { mapAuthError } from './utils/authErrors'
