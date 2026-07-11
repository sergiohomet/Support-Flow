import { renderHook, act } from '@testing-library/react'
import { useListCategories } from '../useListCategories'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeCategoryRow = {
  id: 'cat-1',
  name: 'Facturación',
  description: 'Problemas de facturación',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  max_resolution_hours: 24,
}

describe('useListCategories', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('calls rpc("admin_list_categories") with no params on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

    renderHook(() => useListCategories())

    await act(async () => {
      // wait for mount effect to complete
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_list_categories')
  })

  it('maps snake_case to camelCase in returned categories', async () => {
    mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

    const { result } = renderHook(() => useListCategories())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.categories).toEqual([
      {
        id: 'cat-1',
        name: 'Facturación',
        description: 'Problemas de facturación',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        maxResolutionHours: 24,
      },
    ])
  })

  it('sets isFetching true during call and false after resolution', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useListCategories())

    // isFetching should be true immediately after mount triggers the effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.isFetching).toBe(true)

    await act(async () => {
      resolveRpc({ data: [], error: null })
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.isFetching).toBe(false)
  })

  it('categories is empty array when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useListCategories())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.categories).toEqual([])
  })

  it('sets error string when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useListCategories())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.categories).toEqual([])
  })

  it('refetch() re-calls the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

    const { result } = renderHook(() => useListCategories())

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
