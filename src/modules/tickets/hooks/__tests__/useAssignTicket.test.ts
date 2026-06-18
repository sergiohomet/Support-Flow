import { renderHook, act } from '@testing-library/react'
import { useAssignTicket } from '../useAssignTicket'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useAssignTicket', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('execute(ticketId, agentId) calls rpc("assign_ticket") with correct params', async () => {
    const { result } = renderHook(() => useAssignTicket())

    await act(async () => {
      await result.current.execute('ticket-1', 'agent-1')
    })

    expect(mockRpc).toHaveBeenCalledWith('assign_ticket', {
      p_ticket_id: 'ticket-1',
      p_agent_id: 'agent-1',
    })
  })

  it('returns true on success', async () => {
    const { result } = renderHook(() => useAssignTicket())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('ticket-1', 'agent-1')
    })

    expect(returned).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns false and sets error on rpc failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useAssignTicket())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('ticket-1', 'agent-1')
    })

    expect(returned).toBe(false)
    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('parseRpcError strips "agent_limit_exceeded:" prefix from error message', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'agent_limit_exceeded: El agente tiene 5 tickets activos' },
    })

    const { result } = renderHook(() => useAssignTicket())

    await act(async () => {
      await result.current.execute('ticket-1', 'agent-1')
    })

    expect(result.current.error).toBe('El agente tiene 5 tickets activos')
  })

  it('isLoading is false after execute() completes (success)', async () => {
    const { result } = renderHook(() => useAssignTicket())

    await act(async () => {
      await result.current.execute('ticket-1', 'agent-1')
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('isLoading is false after execute() completes (error)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useAssignTicket())

    await act(async () => {
      await result.current.execute('ticket-1', 'agent-1')
    })

    expect(result.current.isLoading).toBe(false)
  })
})
