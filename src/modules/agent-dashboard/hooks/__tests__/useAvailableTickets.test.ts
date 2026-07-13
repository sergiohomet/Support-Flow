import { renderHook, act } from '@testing-library/react'
import { useAvailableTickets } from '../useAvailableTickets'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeTicketRow = {
  id: 'ticket-uuid-1',
  title: 'No puedo acceder a mi cuenta',
  status: 'abierto',
  priority: 'alta',
  category_id: 'cat-1',
  category_name: 'Accesos',
  agent_id: null,
  agent_full_name: null,
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
  escalated_at: null,
  sla_hours: 8,
  comment_count: 0,
}

describe('useAvailableTickets', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('does not call rpc when categoryId is null', async () => {
    renderHook(() => useAvailableTickets(null, 'agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls get_tickets scoped to the category, unassigned only, when categoryId is set', async () => {
    mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

    renderHook(() => useAvailableTickets('cat-1', 'agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('get_tickets', {
      p_status: 'abierto',
      p_category_id: 'cat-1',
      p_only_unassigned: true,
      p_page_size: 50,
    })
  })

  it('maps snake_case rows to camelCase tickets', async () => {
    mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

    const { result } = renderHook(() => useAvailableTickets('cat-1', 'agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.tickets).toEqual([
      {
        id: 'ticket-uuid-1',
        title: 'No puedo acceder a mi cuenta',
        status: 'abierto',
        priority: 'alta',
        categoryId: 'cat-1',
        categoryName: 'Accesos',
        agentId: null,
        agentFullName: null,
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        escalatedAt: null,
        slaHours: 8,
        commentCount: 0,
      },
    ])
  })

  it('sets error string when get_tickets RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useAvailableTickets('cat-1', 'agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.tickets).toEqual([])
  })

  it('refetch() re-calls get_tickets', async () => {
    mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

    const { result } = renderHook(() => useAvailableTickets('cat-1', 'agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('claim() calls assign_ticket with the agent id and refetches on success', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'assign_ticket') return Promise.resolve({ data: [{}], error: null })
      return Promise.resolve({ data: [fakeTicketRow], error: null })
    })

    const { result } = renderHook(() => useAvailableTickets('cat-1', 'agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    mockRpc.mockClear()
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'assign_ticket') return Promise.resolve({ data: [{}], error: null })
      return Promise.resolve({ data: [], error: null })
    })

    let claimResult = false
    await act(async () => {
      claimResult = await result.current.claim('ticket-uuid-1')
    })

    expect(claimResult).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('assign_ticket', {
      p_ticket_id: 'ticket-uuid-1',
      p_agent_id: 'agent-1',
    })
    // refetch happens after a successful claim
    expect(mockRpc).toHaveBeenCalledWith(
      'get_tickets',
      expect.objectContaining({ p_category_id: 'cat-1' })
    )
  })

  it('claim() sets claimError and returns false when assign_ticket fails', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'assign_ticket') {
        return Promise.resolve({ data: null, error: { message: 'already_assigned: Ya asignado' } })
      }
      return Promise.resolve({ data: [], error: null })
    })

    const { result } = renderHook(() => useAvailableTickets('cat-1', 'agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let claimResult = true
    await act(async () => {
      claimResult = await result.current.claim('ticket-uuid-1')
    })

    expect(claimResult).toBe(false)
    expect(result.current.claimError).toBe('Ya asignado')
  })
})
