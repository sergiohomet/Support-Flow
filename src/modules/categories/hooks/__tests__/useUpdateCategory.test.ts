import { renderHook, act } from '@testing-library/react'
import { useUpdateCategory } from '../useUpdateCategory'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useUpdateCategory', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('calls rpc("admin_update_category") with correct params', async () => {
    mockRpc.mockResolvedValue({ data: [{}], error: null })

    const { result } = renderHook(() => useUpdateCategory())

    await act(async () => {
      await result.current.execute('cat-1', 'Facturación', 'Nueva descripción')
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_update_category', {
      p_id: 'cat-1',
      p_name: 'Facturación',
      p_description: 'Nueva descripción',
    })
  })

  it('isLoading is true during call and false after', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useUpdateCategory())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute('cat-1', 'Test')
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: [{}], error: null })
      await executePromise
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('returns true on success', async () => {
    mockRpc.mockResolvedValue({ data: [{}], error: null })

    const { result } = renderHook(() => useUpdateCategory())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('cat-1', 'Test')
    })

    expect(ok!).toBe(true)
  })

  it('returns false and sets error string on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'not_found: Categoría no encontrada' } })

    const { result } = renderHook(() => useUpdateCategory())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('cat-99', 'Test')
    })

    expect(ok!).toBe(false)
    expect(result.current.error).not.toBeNull()
  })

  it('returns false and sets error string on unique constraint failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'duplicate key value' } })

    const { result } = renderHook(() => useUpdateCategory())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('cat-1', 'Duplicated')
    })

    expect(ok!).toBe(false)
    expect(result.current.error).not.toBeNull()
  })
})
