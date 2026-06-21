import { renderHook, act } from '@testing-library/react'
import { useToggleUserStatus } from '../useToggleUserStatus'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useToggleUserStatus', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('execute(userId, isActive) calls rpc("admin_toggle_user_status") with correct params', async () => {
    const { result } = renderHook(() => useToggleUserStatus())

    await act(async () => {
      await result.current.execute('user-1', false)
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_toggle_user_status', {
      p_user_id: 'user-1',
      p_is_active: false,
    })
  })

  it('sets isLoading true during call and false after completion', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useToggleUserStatus())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute('user-1', true)
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: null, error: null })
      await executePromise
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('returns true on success', async () => {
    const { result } = renderHook(() => useToggleUserStatus())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('user-1', true)
    })

    expect(returned).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns false and sets error on RPC failure (uses parseRpcError)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'unauthorized: Cannot deactivate own account' },
    })

    const { result } = renderHook(() => useToggleUserStatus())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('user-1', false)
    })

    expect(returned).toBe(false)
    expect(result.current.error).toBe('Cannot deactivate own account')
  })

  it('returns false and sets generic error when prefix does not match', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useToggleUserStatus())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('user-1', false)
    })

    expect(returned).toBe(false)
    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('isLoading is false after error response', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useToggleUserStatus())

    await act(async () => {
      await result.current.execute('user-1', false)
    })

    expect(result.current.isLoading).toBe(false)
  })
})
