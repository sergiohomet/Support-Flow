import { renderHook, act } from '@testing-library/react'
import { useUpdateUserRole } from '../useUpdateUserRole'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useUpdateUserRole', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('execute(userId, newRole) calls rpc("admin_update_user_role") with correct params', async () => {
    const { result } = renderHook(() => useUpdateUserRole())

    await act(async () => {
      await result.current.execute('user-1', 'admin')
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_update_user_role', {
      p_user_id: 'user-1',
      p_new_role: 'admin',
    })
  })

  it('sets isLoading true during call and false after completion', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useUpdateUserRole())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute('user-1', 'agent')
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: null, error: null })
      await executePromise
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('returns true on success', async () => {
    const { result } = renderHook(() => useUpdateUserRole())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('user-1', 'admin')
    })

    expect(returned).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns false and sets error on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'unauthorized: No permission' } })

    const { result } = renderHook(() => useUpdateUserRole())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('user-1', 'admin')
    })

    expect(returned).toBe(false)
    expect(result.current.error).toBe('No permission')
  })

  it('returns false and sets generic error when prefix does not match', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useUpdateUserRole())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute('user-1', 'agent')
    })

    expect(returned).toBe(false)
    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('isLoading is false after error response', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useUpdateUserRole())

    await act(async () => {
      await result.current.execute('user-1', 'agent')
    })

    expect(result.current.isLoading).toBe(false)
  })
})
