import { renderHook, act } from '@testing-library/react'
import { useSlaComplianceByCategory } from '../useSlaComplianceByCategory'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeCategoryRow = {
  category_id: 'cat-1',
  category_name: 'Hardware',
  max_resolution_hours: 48,
  resolved_count: 52,
  total_count: 57,
  compliance_pct: 91.2,
}

describe('useSlaComplianceByCategory', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('calls rpc("admin_get_sla_compliance_by_category") with date range params on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

    renderHook(() => useSlaComplianceByCategory('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_get_sla_compliance_by_category', {
      p_date_from: '2026-06-24',
      p_date_to: '2026-07-01',
    })
  })

  it('maps snake_case to camelCase in returned rows', async () => {
    mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

    const { result } = renderHook(() => useSlaComplianceByCategory('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([
      {
        categoryId: 'cat-1',
        categoryName: 'Hardware',
        maxResolutionHours: 48,
        resolvedCount: 52,
        totalCount: 57,
        compliancePct: 91.2,
      },
    ])
  })

  it('preserves null compliancePct from the RPC row', async () => {
    mockRpc.mockResolvedValue({ data: [{ ...fakeCategoryRow, compliance_pct: null }], error: null })

    const { result } = renderHook(() => useSlaComplianceByCategory('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data[0]?.compliancePct).toBeNull()
  })

  it('data is empty array when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useSlaComplianceByCategory('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([])
  })

  it('sets error string when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useSlaComplianceByCategory('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.data).toEqual([])
  })

  it('refetches when dateFrom or dateTo params change', async () => {
    mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

    const { rerender } = renderHook(
      ({ dateFrom, dateTo }) => useSlaComplianceByCategory(dateFrom, dateTo),
      { initialProps: { dateFrom: '2026-06-24', dateTo: '2026-07-01' } }
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)

    rerender({ dateFrom: '2026-06-01', dateTo: '2026-07-01' })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('refetch() re-calls the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

    const { result } = renderHook(() => useSlaComplianceByCategory('2026-06-24', '2026-07-01'))

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
