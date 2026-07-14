import { renderHook, act } from '@testing-library/react'
import { useReportsTicketsByWeek } from '../useReportsTicketsByWeek'

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

const fakeWeekRow = {
  week_start: '2026-06-22T00:00:00.000Z',
  ticket_count: 21,
}

describe('useReportsTicketsByWeek', () => {
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

  it('calls rpc("admin_get_reports_tickets_by_week") with date range params on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeWeekRow], error: null })

    renderHook(() => useReportsTicketsByWeek('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_get_reports_tickets_by_week', {
      p_date_from: '2026-06-24',
      p_date_to: '2026-07-01',
    })
  })

  it('maps snake_case to camelCase in returned rows', async () => {
    mockRpc.mockResolvedValue({ data: [fakeWeekRow], error: null })

    const { result } = renderHook(() => useReportsTicketsByWeek('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([
      {
        weekStart: '2026-06-22T00:00:00.000Z',
        ticketCount: 21,
      },
    ])
  })

  it('data is empty array when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useReportsTicketsByWeek('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([])
  })

  it('sets error string when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useReportsTicketsByWeek('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.data).toEqual([])
  })

  it('refetches when dateFrom or dateTo params change', async () => {
    mockRpc.mockResolvedValue({ data: [fakeWeekRow], error: null })

    const { rerender } = renderHook(
      ({ dateFrom, dateTo }) => useReportsTicketsByWeek(dateFrom, dateTo),
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
    mockRpc.mockResolvedValue({ data: [fakeWeekRow], error: null })

    const { result } = renderHook(() => useReportsTicketsByWeek('2026-06-24', '2026-07-01'))

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
      renderHook(() => useReportsTicketsByWeek('2026-06-24', '2026-07-01'))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockChannel).toHaveBeenCalledWith('reports-tickets-by-week')
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
      const { unmount } = renderHook(() => useReportsTicketsByWeek('2026-06-24', '2026-07-01'))
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })

    it('a postgres_changes event calls the RPC with the LATEST date range, not the one captured at mount', async () => {
      mockRpc.mockResolvedValue({ data: [fakeWeekRow], error: null })
      const { rerender } = renderHook(
        ({ dateFrom, dateTo }) => useReportsTicketsByWeek(dateFrom, dateTo),
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

      expect(mockRpc).toHaveBeenCalledWith('admin_get_reports_tickets_by_week', {
        p_date_from: '2026-06-01',
        p_date_to: '2026-07-01',
      })
    })
  })
})
