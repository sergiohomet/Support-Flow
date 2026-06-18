import type { StateCreator } from 'zustand'

export type UserRole = 'client' | 'agent' | 'admin'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
}

export interface AuthSlice {
  user: AuthUser | null
  isAuthReady: boolean
  setUser: (user: AuthUser | null) => void
  setAuthReady: (ready: boolean) => void
  signOut: () => void
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isAuthReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  signOut: () => set({ user: null, isAuthReady: true }),
})
