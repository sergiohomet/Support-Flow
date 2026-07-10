import { renderHook, act } from '@testing-library/react'
import { useTicketList } from '../useTicketList'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const mockSetTickets = vi.fn()

let mockGetStateReturn = {
  filters: { status: null, priority: null, categoryId: null, agentId: null, page: 1, pageSize: 10 },
}

vi.mock('@/store', () => ({
  useStore: Object.assign(
    vi.fn((selector: (s: unknown) => unknown) => selector({ setTickets: mockSetTickets })),
    { getState: vi.fn(() => mockGetStateReturn) }
  ),
}))

const fakeTicketRow = {
  id: 'ticket-1',
  title: 'Test ticket',
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
    mockGetStateReturn = {
      filters: { status: null, priority: null, categoryId: null, agentId: null, page: 1, pageSize: 10 },
    }
  })

  it('fetch() calls rpc("get_tickets") with params from filters', async () => {
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

  it('fetch() calls setTickets with camelCase-mapped data and total_count from first row', async () => {
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

  it('fetch() maps category_is_active: false → categoryIsActive: false', async () => {
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

  it('fetch() sets error when rpc returns an error and does NOT call setTickets', async () => {
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
