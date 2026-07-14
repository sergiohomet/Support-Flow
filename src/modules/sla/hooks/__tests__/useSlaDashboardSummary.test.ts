import { renderHook, act } from '@testing-library/react'
import { useSlaDashboardSummary } from '../useSlaDashboardSummary'

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
  resolved_in_sla: 118,
  escalated_count: 24,
}

describe('useSlaDashboardSummary', () => {
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

  it('calls rpc("admin_get_sla_dashboard") with date range params on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_get_sla_dashboard', {
      p_date_from: '2026-06-24',
      p_date_to: '2026-07-01',
    })
  })

  it('maps snake_case to camelCase for the single returned row', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    const { result } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual({
      totalTickets: 142,
      resolvedInSla: 118,
      escalatedCount: 24,
    })
  })

  it('data is null when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

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

    const { result } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

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

    const { result } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.data).toBeNull()
  })

  it('refetches when dateFrom or dateTo params change', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    const { rerender } = renderHook(
      ({ dateFrom, dateTo }) => useSlaDashboardSummary(dateFrom, dateTo),
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
    expect(mockRpc).toHaveBeenLastCalledWith('admin_get_sla_dashboard', {
      p_date_from: '2026-06-01',
      p_date_to: '2026-07-01',
    })
  })

  it('refetch() re-calls the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    const { result } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('computes resolvedPct and escalatedPct from the summary counts', async () => {
    mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })

    const { result } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    // 118/142 -> 83.09... rounds to 83; 24/142 -> 16.9... rounds to 17
    expect(result.current.resolvedPct).toBe(83)
    expect(result.current.escalatedPct).toBe(17)
  })

  it('resolvedPct and escalatedPct are 0 when totalTickets is 0 (no data)', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toBeNull()
    expect(result.current.resolvedPct).toBe(0)
    expect(result.current.escalatedPct).toBe(0)
  })

  it('resolvedPct and escalatedPct are 0 when totalTickets is 0 (explicit zero row)', async () => {
    mockRpc.mockResolvedValue({
      data: [{ total_tickets: 0, resolved_in_sla: 0, escalated_count: 0 }],
      error: null,
    })

    const { result } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.resolvedPct).toBe(0)
    expect(result.current.escalatedPct).toBe(0)
  })

  describe('realtime subscription', () => {
    it('subscribes to unfiltered tickets INSERT/UPDATE events on mount', async () => {
      renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockChannel).toHaveBeenCalledWith('sla-dashboard-summary')
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
      const { unmount } = renderHook(() => useSlaDashboardSummary('2026-06-24', '2026-07-01'))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })

    it('a postgres_changes event calls the RPC with the LATEST date range, not the one captured at mount', async () => {
      mockRpc.mockResolvedValue({ data: [fakeSummaryRow], error: null })
      const { rerender } = renderHook(
        ({ dateFrom, dateTo }) => useSlaDashboardSummary(dateFrom, dateTo),
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

      expect(mockRpc).toHaveBeenCalledWith('admin_get_sla_dashboard', {
        p_date_from: '2026-06-01',
        p_date_to: '2026-07-01',
      })
    })
  })
})
