import { renderHook, act } from '@testing-library/react'
import { useHasUnreadNotifications } from '../useHasUnreadNotifications'

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

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('useHasUnreadNotifications', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: false, error: null })

    mockCurrentUserId = 'current-user'

    mockOn.mockReset()
    mockSubscribe.mockReset()
    mockChannel.mockReset()
    mockRemoveChannel.mockReset()

    mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe })
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() })
    mockChannel.mockReturnValue({ on: mockOn })
  })

  it('calls rpc("has_unread_notifications") with no params on mount', async () => {
    renderHook(() => useHasUnreadNotifications())
    await flush()

    expect(mockRpc).toHaveBeenCalledWith('has_unread_notifications')
  })

  it('reflects the RPC boolean result: true', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })

    const { result } = renderHook(() => useHasUnreadNotifications())
    await flush()

    expect(result.current.hasUnread).toBe(true)
  })

  it('reflects the RPC boolean result: false', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    const { result } = renderHook(() => useHasUnreadNotifications())
    await flush()

    expect(result.current.hasUnread).toBe(false)
  })

  it('sets isLoading true during the call and false after resolution', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useHasUnreadNotifications())
    await flush()

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: true, error: null })
      await flush()
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('does not subscribe or call the RPC when there is no current user', async () => {
    mockCurrentUserId = null

    renderHook(() => useHasUnreadNotifications())
    await flush()

    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockChannel).not.toHaveBeenCalled()
  })

  describe('realtime subscription', () => {
    it('subscribes to notifications INSERT and UPDATE events filtered by the current user id', async () => {
      renderHook(() => useHasUnreadNotifications())
      await flush()

      expect(mockChannel).toHaveBeenCalledWith('has-unread-notifications-current-user')
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
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.current-user',
        }),
        expect.any(Function)
      )
      expect(mockSubscribe).toHaveBeenCalledTimes(1)
    })

    it('removes the channel on unmount', async () => {
      const { unmount } = renderHook(() => useHasUnreadNotifications())
      await flush()

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })

    it('re-runs the RPC when an INSERT event fires', async () => {
      renderHook(() => useHasUnreadNotifications())
      await flush()

      mockRpc.mockClear()
      const insertHandler = mockOn.mock.calls[0][2] as () => void
      await act(async () => {
        insertHandler()
        await Promise.resolve()
      })

      expect(mockRpc).toHaveBeenCalledWith('has_unread_notifications')
    })

    it('re-runs the RPC when an UPDATE event fires', async () => {
      renderHook(() => useHasUnreadNotifications())
      await flush()

      mockRpc.mockClear()
      const updateHandler = mockOn.mock.calls[1][2] as () => void
      await act(async () => {
        updateHandler()
        await Promise.resolve()
      })

      expect(mockRpc).toHaveBeenCalledWith('has_unread_notifications')
    })
  })
})
