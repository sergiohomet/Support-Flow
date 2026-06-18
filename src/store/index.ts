import { create } from 'zustand'
import type { AuthSlice } from './authSlice'
import { createAuthSlice } from './authSlice'
import type { TicketsSlice } from './ticketsSlice'
import { createTicketsSlice } from './ticketsSlice'

type RootStore = AuthSlice & TicketsSlice

export const useStore = create<RootStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createTicketsSlice(...a),
}))
