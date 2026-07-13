import { renderHook, act } from '@testing-library/react'
import { useMyAssignedTickets } from '../useMyAssignedTickets'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeTicketRow = {
  id: 'ticket-uuid-2',
  title: 'Factura duplicada',
  status: 'en_proceso',
  priority: 'media',
  category_id: 'cat-2',
  category_name: 'Facturación',
  agent_id: 'agent-1',
  agent_full_name: 'Ana García',
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
  escalated_at: null,
  sla_hours: 24,
  comment_count: 3,
}

describe('useMyAssignedTickets', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('does not call rpc when agentId is null', async () => {
    renderHook(() => useMyAssignedTickets(null))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls get_tickets scoped to the agent, active only, when agentId is set', async () => {
    mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

    renderHook(() => useMyAssignedTickets('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('get_tickets', {
      p_agent_id: 'agent-1',
      p_active_only: true,
      p_page_size: 50,
    })
  })

  it('maps snake_case rows to camelCase tickets', async () => {
    mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

    const { result } = renderHook(() => useMyAssignedTickets('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.tickets).toEqual([
      {
        id: 'ticket-uuid-2',
        title: 'Factura duplicada',
        status: 'en_proceso',
        priority: 'media',
        categoryId: 'cat-2',
        categoryName: 'Facturación',
        agentId: 'agent-1',
        agentFullName: 'Ana García',
        createdAt: '2026-07-12T00:00:00Z',
        updatedAt: '2026-07-12T00:00:00Z',
        escalatedAt: null,
        slaHours: 24,
        commentCount: 3,
      },
    ])
  })

  it('sets error string when get_tickets RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useMyAssignedTickets('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.tickets).toEqual([])
  })

  it('refetch() re-calls get_tickets', async () => {
    mockRpc.mockResolvedValue({ data: [fakeTicketRow], error: null })

    const { result } = renderHook(() => useMyAssignedTickets('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('resolve() calls update_ticket_status with resuelto and refetches on success', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'update_ticket_status') return Promise.resolve({ data: [{}], error: null })
      return Promise.resolve({ data: [fakeTicketRow], error: null })
    })

    const { result } = renderHook(() => useMyAssignedTickets('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    mockRpc.mockClear()
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'update_ticket_status') return Promise.resolve({ data: [{}], error: null })
      return Promise.resolve({ data: [], error: null })
    })

    let resolveResult = false
    await act(async () => {
      resolveResult = await result.current.resolve('ticket-uuid-2')
    })

    expect(resolveResult).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('update_ticket_status', {
      p_ticket_id: 'ticket-uuid-2',
      p_new_status: 'resuelto',
    })
    expect(mockRpc).toHaveBeenCalledWith(
      'get_tickets',
      expect.objectContaining({ p_agent_id: 'agent-1' })
    )
  })

  it('returnToPool() calls unassign_ticket and refetches on success', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'unassign_ticket') return Promise.resolve({ data: [{}], error: null })
      return Promise.resolve({ data: [fakeTicketRow], error: null })
    })

    const { result } = renderHook(() => useMyAssignedTickets('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    mockRpc.mockClear()
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'unassign_ticket') return Promise.resolve({ data: [{}], error: null })
      return Promise.resolve({ data: [], error: null })
    })

    let returnResult = false
    await act(async () => {
      returnResult = await result.current.returnToPool('ticket-uuid-2')
    })

    expect(returnResult).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('unassign_ticket', { p_ticket_id: 'ticket-uuid-2' })
    expect(mockRpc).toHaveBeenCalledWith(
      'get_tickets',
      expect.objectContaining({ p_agent_id: 'agent-1' })
    )
  })

  it('resolve() returns false and does not refetch when update_ticket_status fails', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'update_ticket_status') {
        return Promise.resolve({ data: null, error: { message: 'invalid_transition: no válido' } })
      }
      return Promise.resolve({ data: [], error: null })
    })

    const { result } = renderHook(() => useMyAssignedTickets('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let resolveResult = true
    await act(async () => {
      resolveResult = await result.current.resolve('ticket-uuid-2')
    })

    expect(resolveResult).toBe(false)
  })
})
