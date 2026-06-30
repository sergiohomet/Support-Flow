import { renderHook, act } from '@testing-library/react'
import { useCreateCategory } from '../useCreateCategory'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useCreateCategory', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('calls rpc("admin_create_category") with correct params', async () => {
    mockRpc.mockResolvedValue({ data: [{}], error: null })

    const { result } = renderHook(() => useCreateCategory())

    await act(async () => {
      await result.current.execute('Facturación', 'Problemas de facturación')
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_create_category', {
      p_name: 'Facturación',
      p_description: 'Problemas de facturación',
    })
  })

  it('calls rpc with p_description undefined when not provided', async () => {
    mockRpc.mockResolvedValue({ data: [{}], error: null })

    const { result } = renderHook(() => useCreateCategory())

    await act(async () => {
      await result.current.execute('Soporte')
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_create_category', {
      p_name: 'Soporte',
      p_description: undefined,
    })
  })

  it('isLoading is true during call and false after', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useCreateCategory())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute('Test')
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

    const { result } = renderHook(() => useCreateCategory())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('Test')
    })

    expect(ok!).toBe(true)
  })

  it('returns false and sets error string on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useCreateCategory())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('Test')
    })

    expect(ok!).toBe(false)
    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
  })
})
