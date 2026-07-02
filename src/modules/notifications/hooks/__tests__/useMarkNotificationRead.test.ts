import { renderHook, act } from '@testing-library/react'
import { useMarkNotificationRead } from '../useMarkNotificationRead'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useMarkNotificationRead', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('calls rpc("mark_notification_read") with correct params', async () => {
    mockRpc.mockResolvedValue({ data: [{ id: 'notif-1', is_read: true }], error: null })

    const { result } = renderHook(() => useMarkNotificationRead())

    await act(async () => {
      await result.current.execute('notif-1')
    })

    expect(mockRpc).toHaveBeenCalledWith('mark_notification_read', {
      p_notification_id: 'notif-1',
    })
  })

  it('isLoading is true during call and false after', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useMarkNotificationRead())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute('notif-1')
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: [{ id: 'notif-1', is_read: true }], error: null })
      await executePromise
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('returns true on success', async () => {
    mockRpc.mockResolvedValue({ data: [{ id: 'notif-1', is_read: true }], error: null })

    const { result } = renderHook(() => useMarkNotificationRead())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('notif-1')
    })

    expect(ok!).toBe(true)
  })

  it('returns false and sets error string on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'not_found: Notificación no encontrada' } })

    const { result } = renderHook(() => useMarkNotificationRead())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('notif-99')
    })

    expect(ok!).toBe(false)
    expect(result.current.error).not.toBeNull()
  })
})
