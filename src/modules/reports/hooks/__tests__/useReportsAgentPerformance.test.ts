import { renderHook, act } from '@testing-library/react'
import { useReportsAgentPerformance } from '../useReportsAgentPerformance'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeAgentRow = {
  agent_id: 'agent-1',
  agent_full_name: 'Jane Doe',
  resolved_count: 40,
  avg_working_hours: 6.4,
  sla_compliance_pct: 88.9,
}

describe('useReportsAgentPerformance', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('calls rpc("admin_get_reports_agent_performance") with date range params on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAgentRow], error: null })

    renderHook(() => useReportsAgentPerformance('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_get_reports_agent_performance', {
      p_date_from: '2026-06-24',
      p_date_to: '2026-07-01',
    })
  })

  it('maps snake_case to camelCase in returned rows', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAgentRow], error: null })

    const { result } = renderHook(() => useReportsAgentPerformance('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([
      {
        agentId: 'agent-1',
        agentFullName: 'Jane Doe',
        resolvedCount: 40,
        avgWorkingHours: 6.4,
        slaCompliancePct: 88.9,
      },
    ])
  })

  it('preserves null numeric fields from the RPC row', async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...fakeAgentRow, avg_working_hours: null, sla_compliance_pct: null }],
      error: null,
    })

    const { result } = renderHook(() => useReportsAgentPerformance('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data[0]?.avgWorkingHours).toBeNull()
    expect(result.current.data[0]?.slaCompliancePct).toBeNull()
  })

  it('data is empty array when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useReportsAgentPerformance('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([])
  })

  it('sets error string when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useReportsAgentPerformance('2026-06-24', '2026-07-01'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.data).toEqual([])
  })

  it('refetches when dateFrom or dateTo params change', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAgentRow], error: null })

    const { rerender } = renderHook(
      ({ dateFrom, dateTo }) => useReportsAgentPerformance(dateFrom, dateTo),
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
    mockRpc.mockResolvedValue({ data: [fakeAgentRow], error: null })

    const { result } = renderHook(() => useReportsAgentPerformance('2026-06-24', '2026-07-01'))

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
