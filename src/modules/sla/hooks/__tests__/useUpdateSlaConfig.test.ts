import { renderHook, act } from '@testing-library/react'
import { useUpdateSlaConfig } from '../useUpdateSlaConfig'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useUpdateSlaConfig', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it('calls rpc("admin_update_sla_config") with correct params', async () => {
    mockRpc.mockResolvedValue({ data: [{}], error: null })

    const { result } = renderHook(() => useUpdateSlaConfig())

    await act(async () => {
      await result.current.execute('cat-1', 48, true)
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_update_sla_config', {
      p_category_id: 'cat-1',
      p_max_resolution_hours: 48,
      p_escalation_enabled: true,
    })
  })

  it('isLoading is true during call and false after', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useUpdateSlaConfig())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute('cat-1', 48, true)
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

    const { result } = renderHook(() => useUpdateSlaConfig())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('cat-1', 48, true)
    })

    expect(ok!).toBe(true)
  })

  it('returns false and sets error string on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'not_found: Categoría no encontrada' } })

    const { result } = renderHook(() => useUpdateSlaConfig())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('cat-99', 48, true)
    })

    expect(ok!).toBe(false)
    expect(result.current.error).not.toBeNull()
  })

  it('returns false and sets error string on validation failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'validation: Las horas máximas deben estar entre 1 y 999' } })

    const { result } = renderHook(() => useUpdateSlaConfig())

    let ok: boolean
    await act(async () => {
      ok = await result.current.execute('cat-1', 1000, true)
    })

    expect(ok!).toBe(false)
    expect(result.current.error).not.toBeNull()
  })
})
