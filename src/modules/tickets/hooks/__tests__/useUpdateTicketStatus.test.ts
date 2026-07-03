import { renderHook, act } from '@testing-library/react'
import { useUpdateTicketStatus } from '../useUpdateTicketStatus'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useUpdateTicketStatus', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('execute(ticketId, newStatus) calls rpc("update_ticket_status") with correct params', async () => {
    const { result } = renderHook(() => useUpdateTicketStatus())

    await act(async () => {
      await result.current.execute('ticket-1', 'en_proceso')
    })

    expect(mockRpc).toHaveBeenCalledWith('update_ticket_status', {
      p_ticket_id: 'ticket-1',
      p_new_status: 'en_proceso',
    })
  })

  it('returns true on success', async () => {
    const { result } = renderHook(() => useUpdateTicketStatus())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('ticket-1', 'en_proceso')
    })

    expect(returned).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns false and sets error on rpc failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useUpdateTicketStatus())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('ticket-1', 'resuelto')
    })

    expect(returned).toBe(false)
    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('parseRpcError strips "invalid_transition:" prefix from error message', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'invalid_transition: Transición abierto → reabierto no permitida' },
    })

    const { result } = renderHook(() => useUpdateTicketStatus())

    await act(async () => {
      await result.current.execute('ticket-1', 'reabierto')
    })

    expect(result.current.error).toBe('Transición abierto → reabierto no permitida')
  })

  it('isLoading is false after execute() completes (success)', async () => {
    const { result } = renderHook(() => useUpdateTicketStatus())

    await act(async () => {
      await result.current.execute('ticket-1', 'en_proceso')
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('isLoading is false after execute() completes (error)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useUpdateTicketStatus())

    await act(async () => {
      await result.current.execute('ticket-1', 'resuelto')
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('always calls the RPC and lets the backend be the sole transition-validity authority (e.g. direct abierto -> resuelto)', async () => {
    const { result } = renderHook(() => useUpdateTicketStatus())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('ticket-1', 'resuelto')
    })

    expect(returned).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('update_ticket_status', {
      p_ticket_id: 'ticket-1',
      p_new_status: 'resuelto',
    })
  })
})
