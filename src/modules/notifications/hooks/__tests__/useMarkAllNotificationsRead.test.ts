import { renderHook, act } from '@testing-library/react'
import { useMarkAllNotificationsRead } from '../useMarkAllNotificationsRead'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useMarkAllNotificationsRead', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('calls rpc("mark_all_notifications_read") with no params', async () => {
    mockRpc.mockResolvedValue({ data: [{ updated_count: 3 }], error: null })

    const { result } = renderHook(() => useMarkAllNotificationsRead())

    await act(async () => {
      await result.current.execute()
    })

    expect(mockRpc).toHaveBeenCalledWith('mark_all_notifications_read')
  })

  it('isLoading is true during call and false after', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useMarkAllNotificationsRead())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute()
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: [{ updated_count: 3 }], error: null })
      await executePromise
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('returns true on success', async () => {
    mockRpc.mockResolvedValue({ data: [{ updated_count: 3 }], error: null })

    const { result } = renderHook(() => useMarkAllNotificationsRead())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute()
    })

    expect(ok!).toBe(true)
  })

  it('returns false and sets error string on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useMarkAllNotificationsRead())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute()
    })

    expect(ok!).toBe(false)
    expect(result.current.error).not.toBeNull()
  })
})
