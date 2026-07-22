import { Navigate } from 'react-router-dom'
import { useStore } from '@/store'

interface PublicOnlyGuardProps {
  children: React.ReactNode
}

export function PublicOnlyGuard({ children }: PublicOnlyGuardProps) {
  const user = useStore((s) => s.user)
  const isAuthReady = useStore((s) => s.isAuthReady)

  if (!isAuthReady) return null

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
