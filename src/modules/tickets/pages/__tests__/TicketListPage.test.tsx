import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TicketListPage } from '../TicketListPage'

// --- hook mocks ---

const mockFetch = vi.fn()
const mockLoadCategories = vi.fn()
const mockLoadAgents = vi.fn()

vi.mock('@/modules/tickets/hooks/useTicketList', () => ({
  useTicketList: vi.fn(),
}))

// --- store mock ---

const mockSetFilters = vi.fn()
const mockResetFilters = vi.fn()

type MockState = {
  tickets: unknown[]
  filters: {
    status: null
    priority: null
    categoryId: null
    agentId: null
    page: number
    pageSize: number
  }
  pagination: { totalCount: number; currentPage: number }
  categories: unknown[]
  agents: unknown[]
  setFilters: typeof mockSetFilters
  resetFilters: typeof mockResetFilters
  user: { id: string; email: string; full_name: string; role: 'client' | 'agent' | 'admin' } | null
}

let mockState: MockState = {
  tickets: [],
  filters: { status: null, priority: null, categoryId: null, agentId: null, page: 1, pageSize: 10 },
  pagination: { totalCount: 0, currentPage: 1 },
  categories: [],
  agents: [],
  setFilters: mockSetFilters,
  resetFilters: mockResetFilters,
  user: null,
}

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: MockState) => unknown) => selector(mockState)),
}))

// --- helpers ---

import { useTicketList } from '@/modules/tickets/hooks/useTicketList'

function makeHookReturn(overrides: Partial<ReturnType<typeof useTicketList>> = {}): ReturnType<typeof useTicketList> {
  return {
    isFetching: false,
    isLoadingCategories: false,
    isLoadingAgents: false,
    error: null,
    fetch: mockFetch,
    loadCategories: mockLoadCategories,
    loadAgents: mockLoadAgents,
    ...overrides,
  }
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <TicketListPage />
    </MemoryRouter>
  )
}

describe('TicketListPage', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockLoadCategories.mockReset()
    mockLoadAgents.mockReset()
    mockSetFilters.mockReset()
    mockResetFilters.mockReset()

    mockFetch.mockResolvedValue(undefined)
    mockLoadCategories.mockResolvedValue(undefined)
    mockLoadAgents.mockResolvedValue(undefined)

    mockState = {
      tickets: [],
      filters: { status: null, priority: null, categoryId: null, agentId: null, page: 1, pageSize: 10 },
      pagination: { totalCount: 0, currentPage: 1 },
      categories: [],
      agents: [],
      setFilters: mockSetFilters,
      resetFilters: mockResetFilters,
      user: null,
    }

    vi.mocked(useTicketList).mockReturnValue(makeHookReturn())
  })

  it('shows spinner while isFetching is true', () => {
    vi.mocked(useTicketList).mockReturnValue(makeHookReturn({ isFetching: true }))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows empty state when isFetching is false and tickets array is empty', () => {
    mockState.tickets = []
    vi.mocked(useTicketList).mockReturnValue(makeHookReturn({ isFetching: false }))
    renderPage()
    expect(screen.getByText(/no hay tickets/i)).toBeInTheDocument()
  })

  it('renders ticket list when tickets are present', () => {
    mockState.tickets = [
      {
        id: 'ticket-1',
        title: 'Mi primer ticket',
        status: 'abierto',
        priority: 'media',
        categoryId: 'cat-1',
        categoryName: 'Soporte',
        clientId: 'user-1',
        clientFullName: 'Juan Pérez',
        agentId: null,
        agentFullName: null,
        createdAt: '2026-06-15T10:00:00Z',
        updatedAt: '2026-06-15T10:00:00Z',
        commentCount: 0,
      },
    ]
    mockState.pagination = { totalCount: 1, currentPage: 1 }

    vi.mocked(useTicketList).mockReturnValue(makeHookReturn({ isFetching: false }))
    renderPage()
    expect(screen.getByText('Mi primer ticket')).toBeInTheDocument()
  })

  it('calls fetch(), loadCategories() and loadAgents() on mount', () => {
    renderPage()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockLoadCategories).toHaveBeenCalledTimes(1)
    expect(mockLoadAgents).toHaveBeenCalledTimes(1)
  })

  it('shows "Nuevo ticket" button for client role', () => {
    mockState.user = { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' }
    renderPage()
    expect(screen.getByText('Nuevo ticket')).toBeInTheDocument()
  })

  it('does NOT show "Nuevo ticket" button for agent role', () => {
    mockState.user = { id: 'u2', email: 'agent@test.com', full_name: 'Agent User', role: 'agent' }
    renderPage()
    expect(screen.queryByText('Nuevo ticket')).not.toBeInTheDocument()
  })

  it('renders the page heading "Tickets"', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /^tickets$/i })).toBeInTheDocument()
  })
})
