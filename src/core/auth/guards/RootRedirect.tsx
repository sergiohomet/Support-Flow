import React from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '@/store'

export function RootRedirect(): React.ReactElement | null {
  const user = useStore((s) => s.user)
  const isAuthReady = useStore((s) => s.isAuthReady)

  if (!isAuthReady) return null

  return <Navigate to={user?.role === 'agent' ? '/agent/dashboard' : '/tickets'} replace />
}
