import { renderHook, act } from '@testing-library/react'
import { useTicketList } from '../useTicketList'

const mockRpc = vi.fn()
const mockOn = vi.fn()
const mockSubscribe = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

const mockSetTickets = vi.fn()

let mockState = {
  setTickets: mockSetTickets,
  filters: { status: null as string | null, priority: null, categoryId: null, agentId: null, page: 1, pageSize: 10 },
}

vi.mock('@/store', () => ({
  useStore: Object.assign(
    vi.fn((selector: (s: unknown) => unknown) => selector(mockState)),
    { getState: vi.fn(() => mockState) }
  ),
}))

const fakeTicketRow = {
  id: 'ticket-1',
  title: 'Test ticket',
  description: 'A description for the test ticket.',
  status: 'abierto',
  priority: 'media',
  category_id: 'cat-1',
  category_name: 'Soporte',
  category_is_active: true,
  client_id: 'user-1',
  client_full_name: 'Juan Pérez',
  agent_id: null,
  agent_full_name: null,
  created_at: '2026-06-15T10:00:00Z',
  updated_at: '2026-06-15T10:00:00Z',
  comment_count: 0,
  total_count: 1,
}

describe('useTicketList', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockSetTickets.mockReset()
    mockState = {
      setTickets: mockSetTickets,
      filters: { status: null, priority: null, categoryId: null, agentId: null, page: 1, pageSize: 10 },
    }

    mockOn.mockReset()
    mockSubscribe.mockReset()
    mockChannel.mockReset()
    mockRemoveChannel.mockReset()

    mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe })
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() })
    mockChannel.mockReturnValue({ on: mockOn })
  })

  describe('fetch() (manual call, enabled defaults to false)', () => {
    it('calls rpc("get_tickets") with params from filters', async () => {
      mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

      const { result } = renderHook(() => useTicketList())

      await act(async () => {
        await result.current.fetch()
      })

      expect(mockRpc).toHaveBeenCalledWith('get_tickets', {
        p_status: undefined,
        p_priority: undefined,
        p_category_id: undefined,
        p_agent_id: undefined,
        p_page: 1,
        p_page_size: 10,
      })
    })

    it('calls setTickets with camelCase-mapped data and total_count from first row', async () => {
      mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

      const { result } = renderHook(() => useTicketList())

      await act(async () => {
        await result.current.fetch()
      })

      expect(mockSetTickets).toHaveBeenCalledWith(
        [
          {
            id: 'ticket-1',
            title: 'Test ticket',
            description: 'A description for the test ticket.',
            status: 'abierto',
            priority: 'media',
            categoryId: 'cat-1',
            categoryName: 'Soporte',
            categoryIsActive: true,
            clientId: 'user-1',
            clientFullName: 'Juan Pérez',
            agentId: null,
            agentFullName: null,
            createdAt: '2026-06-15T10:00:00Z',
            updatedAt: '2026-06-15T10:00:00Z',
            commentCount: 0,
          },
        ],
        1
      )
    })

    it('maps category_is_active: false → categoryIsActive: false', async () => {
      mockRpc.mockResolvedValue({
        data: [{ ...fakeTicketRow, category_is_active: false }],
        error: null,
      })

      const { result } = renderHook(() => useTicketList())

      await act(async () => {
        await result.current.fetch()
      })

      const [mappedTickets] = mockSetTickets.mock.calls[0] as [Array<{ categoryIsActive: boolean }>]
      expect(mappedTickets[0].categoryIsActive).toBe(false)
    })

    it('sets error when rpc returns an error and does NOT call setTickets', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

      const { result } = renderHook(() => useTicketList())

      await act(async () => {
        await result.current.fetch()
      })

      expect(result.current.error).toBe('DB error')
      expect(mockSetTickets).not.toHaveBeenCalled()
    })

    it('isFetching is false after fetch() completes', async () => {
      const { result } = renderHook(() => useTicketList())

      await act(async () => {
        await result.current.fetch()
      })

      expect(result.current.isFetching).toBe(false)
    })
  })

  describe('auto-fetch effect (enabled=true)', () => {
    it('does not call the RPC when enabled is false', async () => {
      renderHook(() => useTicketList(false))

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('fetches on mount when enabled is true', async () => {
      mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

      renderHook(() => useTicketList(true))

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockSetTickets).toHaveBeenCalledTimes(1)
    })

    it('refetches when filters.status changes while enabled', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const { rerender } = renderHook(() => useTicketList(true))

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockRpc).toHaveBeenCalledTimes(1)

      mockState = { ...mockState, filters: { ...mockState.filters, status: 'abierto' } }
      rerender()

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockRpc).toHaveBeenCalledTimes(2)
    })

    it('refetches when filters.page changes while enabled', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const { rerender } = renderHook(() => useTicketList(true))

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockRpc).toHaveBeenCalledTimes(1)

      mockState = { ...mockState, filters: { ...mockState.filters, page: 2 } }
      rerender()

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockRpc).toHaveBeenCalledTimes(2)
    })
  })

  describe('realtime subscription', () => {
    it('subscribes to unfiltered tickets INSERT/UPDATE events when enabled', async () => {
      renderHook(() => useTicketList(true))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockChannel).toHaveBeenCalledWith('tickets-list')
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'INSERT', schema: 'public', table: 'tickets' }),
        expect.any(Function)
      )
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'UPDATE', schema: 'public', table: 'tickets' }),
        expect.any(Function)
      )
      expect(mockSubscribe).toHaveBeenCalledTimes(1)
    })

    it('does not subscribe when enabled is false', async () => {
      renderHook(() => useTicketList(false))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockChannel).not.toHaveBeenCalled()
    })

    it('removes the channel on unmount', async () => {
      const { unmount } = renderHook(() => useTicketList(true))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })

    it('a postgres_changes event calls fetch() with the LATEST filters, not the ones captured at mount', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      renderHook(() => useTicketList(true))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      // Mutate filters after mount, without re-rendering the hook — the
      // realtime handler must read live state via the ref, not a stale
      // closure captured when the channel was created.
      mockState = { ...mockState, filters: { ...mockState.filters, page: 2 } }

      mockRpc.mockClear()
      const insertHandler = mockOn.mock.calls[0][2] as () => void
      await act(async () => {
        insertHandler()
        await Promise.resolve()
      })

      expect(mockRpc).toHaveBeenCalledWith('get_tickets', expect.objectContaining({ p_page: 2 }))
    })
  })
})
