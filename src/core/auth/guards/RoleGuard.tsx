import React from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '@/store'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  redirectTo?: string
}

export function RoleGuard({ allowedRoles, children, redirectTo = '/login' }: RoleGuardProps): React.ReactElement | null {
  const user = useStore((s) => s.user)
  const isAuthReady = useStore((s) => s.isAuthReady)

  if (!isAuthReady) return null
  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) return <Navigate to={redirectTo} replace />

  return <>{children}</>
}
