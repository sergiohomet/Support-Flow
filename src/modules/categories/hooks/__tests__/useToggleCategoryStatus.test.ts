import { renderHook, act } from '@testing-library/react'
import { useToggleCategoryStatus } from '../useToggleCategoryStatus'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useToggleCategoryStatus', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('calls rpc("admin_toggle_category_status") with correct param', async () => {
    mockRpc.mockResolvedValue({ data: [{ is_active: false }], error: null })

    const { result } = renderHook(() => useToggleCategoryStatus())

    await act(async () => {
      await result.current.execute('cat-1')
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_toggle_category_status', {
      p_id: 'cat-1',
    })
  })

  it('isLoading is true during call and false after', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useToggleCategoryStatus())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute('cat-1')
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: [{ is_active: false }], error: null })
      await executePromise
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('returns true on success', async () => {
    mockRpc.mockResolvedValue({ data: [{ is_active: false }], error: null })

    const { result } = renderHook(() => useToggleCategoryStatus())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('cat-1')
    })

    expect(ok!).toBe(true)
  })

  it('returns false and sets error string on not-found failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'not_found: Categoría no encontrada' } })

    const { result } = renderHook(() => useToggleCategoryStatus())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('cat-99')
    })

    expect(ok!).toBe(false)
    expect(result.current.error).not.toBeNull()
  })
})
