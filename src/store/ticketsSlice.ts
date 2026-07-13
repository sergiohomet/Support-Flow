import type { StateCreator } from 'zustand'

export type TicketStatus = 'abierto' | 'en_proceso' | 'resuelto' | 'reabierto'
export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica'

export interface TicketListItem {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  categoryId: string
  categoryName: string
  categoryIsActive: boolean
  clientId: string
  clientFullName: string
  agentId: string | null
  agentFullName: string | null
  createdAt: string
  updatedAt: string
  commentCount: number
}

export interface TicketFilters {
  status: TicketStatus | null
  priority: TicketPriority | null
  categoryId: string | null
  agentId: string | null
  page: number
  pageSize: number
}

export interface TicketPagination {
  totalCount: number
  currentPage: number
}

export interface Category {
  id: string
  name: string
  description: string | null
}

export interface Agent {
  id: string
  fullName: string
  categoryId: string | null
  categoryName: string | null
  activeTicketCount: number
}

export interface TicketsSlice {
  tickets: TicketListItem[]
  filters: TicketFilters
  pagination: TicketPagination
  categories: Category[]
  agents: Agent[]
  setTickets: (tickets: TicketListItem[], totalCount: number) => void
  setFilters: (filters: Partial<TicketFilters>) => void
  resetFilters: () => void
  setCategories: (categories: Category[]) => void
  setAgents: (agents: Agent[]) => void
}

const DEFAULT_FILTERS: TicketFilters = {
  status: null,
  priority: null,
  categoryId: null,
  agentId: null,
  page: 1,
  pageSize: 10,
}

export const createTicketsSlice: StateCreator<TicketsSlice> = (set) => ({
  tickets: [],
  filters: DEFAULT_FILTERS,
  pagination: { totalCount: 0, currentPage: 1 },
  categories: [],
  agents: [],

  setTickets: (tickets, totalCount) =>
    set((state) => ({
      tickets,
      pagination: {
        totalCount,
        currentPage: state.filters.page,
      },
    })),

  setFilters: (partial) =>
    set((state) => {
      const isPageOnly =
        Object.keys(partial).length === 1 && 'page' in partial
      const newPage = isPageOnly ? (partial.page ?? state.filters.page) : 1
      return {
        filters: {
          ...state.filters,
          ...partial,
          page: newPage,
        },
      }
    }),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  setCategories: (categories) => set({ categories }),

  setAgents: (agents) => set({ agents }),
})
