import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TicketListPage } from '../TicketListPage'

// --- hook mock ---

const mockFetch = vi.fn()

vi.mock('@/modules/tickets/hooks/useTicketList', () => ({
  useTicketList: vi.fn(),
}))

// --- store mock ---

const mockSetFilters = vi.fn()
const mockResetFilters = vi.fn()

type MockState = {
  tickets: unknown[]
  filters: {
    status: string | null
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
    error: null,
    fetch: mockFetch,
    ...overrides,
  }
}

const SAMPLE_TICKET = {
  id: 'abcdef12-0000-0000-0000-000000000000',
  title: 'Mi primer ticket',
  status: 'abierto' as const,
  priority: 'media' as const,
  categoryId: 'cat-1',
  categoryName: 'Soporte',
  clientId: 'user-1',
  clientFullName: 'Juan Pérez',
  agentId: null,
  agentFullName: null,
  createdAt: '2026-06-15T10:00:00Z',
  updatedAt: '2026-06-15T10:00:00Z',
  commentCount: 0,
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <TicketListPage />
    </MemoryRouter>,
  )
}

describe('TicketListPage', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSetFilters.mockReset()
    mockResetFilters.mockReset()
    mockFetch.mockResolvedValue(undefined)

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

    vi.mocked(useTicketList).mockClear()
    vi.mocked(useTicketList).mockReturnValue(makeHookReturn())
  })

  describe('initial render — no active filters', () => {
    it('calls useTicketList with enabled: false on mount', () => {
      renderPage()
      expect(vi.mocked(useTicketList)).toHaveBeenCalledWith(false)
    })

    it('shows the empty-state prompt instead of the ticket table', () => {
      renderPage()
      expect(screen.getByText('Seleccioná un estado o buscá para ver tickets.')).toBeInTheDocument()
    })

    it('does NOT render any ticket cards', () => {
      renderPage()
      expect(screen.queryByText('Ver detalle →')).not.toBeInTheDocument()
    })

    it('renders the heading "Mis Tickets"', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: 'Mis Tickets' })).toBeInTheDocument()
    })

    it('renders all status tabs', () => {
      renderPage()
      expect(screen.getByRole('tab', { name: 'Todos' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Abierto' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'En Proceso' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Resuelto' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Reabierto' })).toBeInTheDocument()
    })
  })

  describe('tab interaction', () => {
    it('calls useTicketList with enabled: true when a status tab is selected', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('tab', { name: 'Abierto' }))
      expect(vi.mocked(useTicketList)).toHaveBeenCalledWith(true)
    })

    it('calls setFilters with the correct status when a tab is selected', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('tab', { name: 'En Proceso' }))
      expect(mockSetFilters).toHaveBeenCalledWith({ status: 'en_proceso' })
    })

    it('calls setFilters with null when "Todos" tab is clicked after active tab', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('tab', { name: 'Abierto' }))
      await user.click(screen.getByRole('tab', { name: 'Todos' }))
      expect(mockSetFilters).toHaveBeenLastCalledWith({ status: null })
    })

    it('shows empty-state prompt (not spinner) when isFetching without active filters', () => {
      vi.mocked(useTicketList).mockReturnValue(makeHookReturn({ isFetching: true }))
      renderPage()
      expect(screen.getByText('Seleccioná un estado o buscá para ver tickets.')).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('renders ticket cards when fetch returns tickets', async () => {
      mockState.tickets = [SAMPLE_TICKET]
      mockState.pagination = { totalCount: 1, currentPage: 1 }
      const user = userEvent.setup()
      renderPage()
      await act(async () => {
        await user.click(screen.getByRole('tab', { name: 'Abierto' }))
      })
      expect(screen.getByText('Mi primer ticket')).toBeInTheDocument()
    })
  })

  describe('search interaction', () => {
    it('does NOT call useTicketList with enabled: true immediately on mount with empty search', () => {
      renderPage()
      expect(vi.mocked(useTicketList)).not.toHaveBeenCalledWith(true)
    })

    it('calls useTicketList with enabled: true after debounce when text is typed in search box', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ delay: null })
      renderPage()
      await act(async () => {
        await user.type(screen.getByRole('searchbox', { name: 'Buscar ticket' }), 'factura')
      })
      await act(async () => {
        vi.advanceTimersByTime(400)
      })
      expect(vi.mocked(useTicketList)).toHaveBeenCalledWith(true)
      vi.useRealTimers()
    })
  })

  describe('reset', () => {
    it('returns to empty state when reset is triggered', async () => {
      const user = userEvent.setup()
      renderPage()
      // Activate a filter first
      act(() => { screen.getByRole('tab', { name: 'Abierto' }).click() })
      // Reset button should appear
      const resetBtn = await screen.findByRole('button', { name: 'Limpiar filtros' })
      await user.click(resetBtn)
      // Empty state should be visible again
      expect(screen.getByText('Seleccioná un estado o buscá para ver tickets.')).toBeInTheDocument()
    })

    it('calls resetFilters on the store when reset is triggered', async () => {
      const user = userEvent.setup()
      renderPage()
      act(() => { screen.getByRole('tab', { name: 'Abierto' }).click() })
      const resetBtn = await screen.findByRole('button', { name: 'Limpiar filtros' })
      await user.click(resetBtn)
      expect(mockResetFilters).toHaveBeenCalledTimes(1)
    })
  })

  describe('role visibility', () => {
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

    it('does NOT show "Nuevo ticket" button for admin role', () => {
      mockState.user = { id: 'u3', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' }
      renderPage()
      expect(screen.queryByText('Nuevo ticket')).not.toBeInTheDocument()
    })
  })
})
