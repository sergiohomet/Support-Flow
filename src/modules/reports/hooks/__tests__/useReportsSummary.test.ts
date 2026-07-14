import { renderHook, act } from '@testing-library/react'
import { useReportsSummary } from '../useReportsSummary'

const mockRpc = vi.fn()
const mockOn = vi.fn()
const mockSubscribe = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

const fakeSummaryRow = {
  total_tickets: 142,
  avg_resolution_hours: 12.5,
  sla_compliance_pct: 91.2,
  escalated_count: 8,
}

describe('useReportsSummary', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })

    mockOn.mockReset()
    mockSubscribe.mockReset()
    mockChannel.mockReset()
    mockRemoveChannel.mockReset()

    mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe })
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() })
    mockChannel.mockReturnValue({ on: mockOn })
  })

  it('calls rpc("admin_get_reports_summary") with date range params on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    renderHook(() => useReportsSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_get_reports_summary', {
      p_date_from: '2026-06-24',
      p_date_to: '2026-07-01',
    })
  })

  it('maps snake_case to camelCase for the single returned row', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    const { result } = renderHook(() => useReportsSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual({
      totalTickets: 142,
      avgResolutionHours: 12.5,
      slaCompliancePct: 91.2,
      escalatedCount: 8,
    })
  })

  it('data is null when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useReportsSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toBeNull()
  })

  it('sets isLoading true during call and false after resolution', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useReportsSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveRpc({ data: [fakeSummaryRow], error: null })
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('sets error string when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useReportsSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.data).toBeNull()
  })

  it('refetches when dateFrom or dateTo params change', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    const { rerender } = renderHook(
      ({ dateFrom, dateTo }) => useReportsSummary(dateFrom, dateTo),
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
    expect(mockRpc).toHaveBeenLastCalledWith('admin_get_reports_summary', {
      p_date_from: '2026-06-01',
      p_date_to: '2026-07-01',
    })
  })

  it('refetch() re-calls the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    const { result } = renderHook(() => useReportsSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  describe('realtime subscription', () => {
    it('subscribes to unfiltered tickets INSERT/UPDATE events on mount', async () => {
      renderHook(() => useReportsSummary('2026-06-24', '2026-07-01'))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockChannel).toHaveBeenCalledWith('reports-summary')
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'INSERT', schema: 'public', table: 'tickets' }),
        expect.any(Function)
      )
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'UPDATE', schema: 'public', table: 'tickets' }),
        expect.any(Function)
      )
      expect(mockSubscribe).toHaveBeenCalledTimes(1)
    })

    it('removes the channel on unmount', async () => {
      const { unmount } = renderHook(() => useReportsSummary('2026-06-24', '2026-07-01'))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })

    it('a postgres_changes event calls the RPC with the LATEST date range, not the one captured at mount', async () => {
      mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })
      const { rerender } = renderHook(
        ({ dateFrom, dateTo }) => useReportsSummary(dateFrom, dateTo),
        { initialProps: { dateFrom: '2026-06-24', dateTo: '2026-07-01' } }
      )
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      // Change the date range via rerender — the subscription itself does
      // not depend on these props (it stays subscribed for the hook's
      // lifetime), so the channel must NOT be re-created.
      rerender({ dateFrom: '2026-06-01', dateTo: '2026-07-01' })
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockChannel).toHaveBeenCalledTimes(1)

      mockRpc.mockClear()
      const insertHandler = mockOn.mock.calls[0][2] as () => void
      await act(async () => {
        insertHandler()
        await Promise.resolve()
      })

      expect(mockRpc).toHaveBeenCalledWith('admin_get_reports_summary', {
        p_date_from: '2026-06-01',
        p_date_to: '2026-07-01',
      })
    })
  })
})
