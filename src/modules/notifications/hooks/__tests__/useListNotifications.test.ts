import { renderHook, act } from '@testing-library/react'
import { useListNotifications } from '../useListNotifications'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeNotificationRow = {
  id: 'notif-1',
  ticket_id: 'ticket-1',
  type: 'status_change',
  message: 'El ticket cambió de estado',
  is_read: false,
  created_at: '2026-01-01T09:41:00Z',
}

describe('useListNotifications', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('calls rpc("get_notifications") with the initial filter value on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeNotificationRow], error: null })

    renderHook(() => useListNotifications('all'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('get_notifications', { p_filter: 'all' })
  })

  it('re-fetches when the filter param changes across re-renders', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { rerender } = renderHook(({ filter }) => useListNotifications(filter), {
      initialProps: { filter: 'all' as const },
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenLastCalledWith('get_notifications', { p_filter: 'all' })

    rerender({ filter: 'unread' })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
    expect(mockRpc).toHaveBeenLastCalledWith('get_notifications', { p_filter: 'unread' })
  })

  it('maps snake_case rows to camelCase via mapNotification', async () => {
    mockRpc.mockResolvedValue({ data: [fakeNotificationRow], error: null })

    const { result } = renderHook(() => useListNotifications('all'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([
      {
        id: 'notif-1',
        ticketId: 'ticket-1',
        type: 'status_change',
        message: 'El ticket cambió de estado',
        isRead: false,
        createdAt: '2026-01-01T09:41:00Z',
      },
    ])
  })

  it('sets isLoading true during call and false after resolution', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useListNotifications('all'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: [], error: null })
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('sets error via parseRpcError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useListNotifications('all'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.data).toEqual([])
  })

  it('data is empty array when RPC returns empty response', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useListNotifications('all'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([])
  })
})
