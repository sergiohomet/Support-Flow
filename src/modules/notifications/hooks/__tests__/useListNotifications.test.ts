import { renderHook, act } from '@testing-library/react'
import { useListNotifications } from '../useListNotifications'

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

let mockCurrentUserId: string | null = 'current-user'
vi.mock('@/store', () => ({
  useStore: (selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: mockCurrentUserId ? { id: mockCurrentUserId } : null }),
}))

const fakeNotificationRow = {
  id: 'notif-1',
  ticket_id: 'ticket-1',
  type: 'status_change',
  message: 'El ticket cambió de estado',
  is_read: false,
  created_at: '2026-01-01T09:41:00Z',
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('useListNotifications', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })

    mockCurrentUserId = 'current-user'

    mockOn.mockReset()
    mockSubscribe.mockReset()
    mockChannel.mockReset()
    mockRemoveChannel.mockReset()

    mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe })
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() })
    mockChannel.mockReturnValue({ on: mockOn })
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

  it('marks a notification as read locally, without waiting for a refetch', async () => {
    mockRpc.mockResolvedValue({ data: [fakeNotificationRow], error: null })

    const { result } = renderHook(() => useListNotifications('all'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data[0].isRead).toBe(false)

    act(() => {
      result.current.markLocallyRead('notif-1')
    })

    expect(result.current.data[0].isRead).toBe(true)
    // Only the RPC call from the initial fetch — marking locally read must not trigger a fetch.
    expect(mockRpc).toHaveBeenCalledTimes(1)
  })

  it('keeps a notification marked as locally read across a subsequent refetch that still reports it unread', async () => {
    mockRpc.mockResolvedValue({ data: [fakeNotificationRow], error: null })

    const { result } = renderHook(() => useListNotifications('all'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    act(() => {
      result.current.markLocallyRead('notif-1')
    })

    expect(result.current.data[0].isRead).toBe(true)

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.data[0].isRead).toBe(true)
  })

  describe('realtime subscription', () => {
    it('subscribes to notifications INSERT events filtered by the current user id on mount', async () => {
      renderHook(() => useListNotifications('all'))
      await flush()

      expect(mockChannel).toHaveBeenCalledWith('notifications-current-user')
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.current-user',
        }),
        expect.any(Function)
      )
      expect(mockSubscribe).toHaveBeenCalledTimes(1)
    })

    it('removes the channel on unmount', async () => {
      const { unmount } = renderHook(() => useListNotifications('all'))
      await flush()

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })

    it('does not subscribe when there is no current user', async () => {
      mockCurrentUserId = null

      renderHook(() => useListNotifications('all'))
      await flush()

      expect(mockChannel).not.toHaveBeenCalled()
    })

    it('an INSERT event triggers a refetch via the latest refetch', async () => {
      renderHook(() => useListNotifications('all'))
      await flush()

      mockRpc.mockClear()
      const insertHandler = mockOn.mock.calls[0][2] as () => void
      await act(async () => {
        insertHandler()
        await Promise.resolve()
      })

      expect(mockRpc).toHaveBeenCalledWith('get_notifications', { p_filter: 'all' })
    })
  })
})
