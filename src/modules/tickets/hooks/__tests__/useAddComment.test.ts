import { renderHook, act } from '@testing-library/react'
import { useAddComment } from '../useAddComment'
import type { TicketComment } from '../../schemas'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeRow = {
  id: 'c-1',
  ticket_id: 'ticket-1',
  user_id: 'user-1',
  user_full_name: 'Juan',
  content: 'Hola',
  created_at: '2026-06-15T10:00:00Z',
}

describe('useAddComment', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [fakeRow], error: null })
  })

  it('execute(ticketId, content) calls rpc("add_ticket_comment") with correct params', async () => {
    const { result } = renderHook(() => useAddComment())

    await act(async () => {
      await result.current.execute('ticket-1', 'Hola')
    })

    expect(mockRpc).toHaveBeenCalledWith('add_ticket_comment', {
      p_ticket_id: 'ticket-1',
      p_content: 'Hola',
    })
  })

  it('returns mapped TicketComment (camelCase) on success', async () => {
    const { result } = renderHook(() => useAddComment())

    let returned: TicketComment | null = null
    await act(async () => {
      returned = await result.current.execute('ticket-1', 'Hola')
    })

    expect(returned).toEqual({
      id: 'c-1',
      ticketId: 'ticket-1',
      userId: 'user-1',
      userFullName: 'Juan',
      content: 'Hola',
      createdAt: '2026-06-15T10:00:00Z',
    })
    expect(result.current.error).toBeNull()
  })

  it('returns null and sets error on rpc failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useAddComment())

    let returned: TicketComment | null = { id: 'sentinel' } as unknown as TicketComment
    await act(async () => {
      returned = await result.current.execute('ticket-1', 'Hola')
    })

    expect(returned).toBeNull()
    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('isLoading is false after execute() completes (success)', async () => {
    const { result } = renderHook(() => useAddComment())

    await act(async () => {
      await result.current.execute('ticket-1', 'Hola')
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('isLoading is false after execute() completes (error)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useAddComment())

    await act(async () => {
      await result.current.execute('ticket-1', 'Hola')
    })

    expect(result.current.isLoading).toBe(false)
  })
})
