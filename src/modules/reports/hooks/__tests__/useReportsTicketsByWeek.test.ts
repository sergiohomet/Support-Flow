import { renderHook, act } from '@testing-library/react'
import { useReportsTicketsByWeek } from '../useReportsTicketsByWeek'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeWeekRow = {
  week_start: '2026-06-22T00:00:00.000Z',
  ticket_count: 21,
}

describe('useReportsTicketsByWeek', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
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
})
