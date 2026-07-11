import { useAuthBootstrap } from './useAuthBootstrap'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthBootstrap()

  return <>{children}</>
}
