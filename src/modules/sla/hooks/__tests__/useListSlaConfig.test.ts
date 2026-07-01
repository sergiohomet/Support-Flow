import { renderHook, act } from '@testing-library/react'
import { useListSlaConfig } from '../useListSlaConfig'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeSlaRow = {
  category_id: 'cat-1',
  category_name: 'Hardware',
  max_resolution_hours: 48,
  escalation_enabled: true,
  updated_at: '2026-01-01T09:41:00Z',
}

describe('useListSlaConfig', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('calls rpc("admin_get_sla_config") with no params on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSlaRow], error: null })

    renderHook(() => useListSlaConfig())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_get_sla_config')
  })

  it('maps snake_case to camelCase in returned rows', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSlaRow], error: null })

    const { result } = renderHook(() => useListSlaConfig())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([
      {
        categoryId: 'cat-1',
        categoryName: 'Hardware',
        maxResolutionHours: 48,
        escalationEnabled: true,
        updatedAt: '2026-01-01T09:41:00Z',
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

    const { result } = renderHook(() => useListSlaConfig())

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

  it('data is empty array when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useListSlaConfig())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([])
  })

  it('sets error string when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useListSlaConfig())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.data).toEqual([])
  })

  it('refetch() re-calls the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSlaRow], error: null })

    const { result } = renderHook(() => useListSlaConfig())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
  })
})
