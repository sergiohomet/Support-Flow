import { renderHook, act } from '@testing-library/react'
import { useSlaAtRiskTickets } from '../useSlaAtRiskTickets'

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

const fakeAtRiskRow = {
  id: 'ticket-uuid-1234',
  title: 'Caída de servidor principal DB',
  category_name: 'Redes',
  agent_full_name: 'Ana Silva',
  minutes_remaining: 12,
}

describe('useSlaAtRiskTickets', () => {
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

  it('calls rpc("admin_get_sla_at_risk_tickets") with default limit on mount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAtRiskRow], error: null })

    renderHook(() => useSlaAtRiskTickets())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_get_sla_at_risk_tickets', { p_limit: 10 })
  })

  it('calls rpc with a custom limit when provided', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAtRiskRow], error: null })

    renderHook(() => useSlaAtRiskTickets(5))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_get_sla_at_risk_tickets', { p_limit: 5 })
  })

  it('maps snake_case to camelCase in returned rows', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAtRiskRow], error: null })

    const { result } = renderHook(() => useSlaAtRiskTickets())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([
      {
        id: 'ticket-uuid-1234',
        title: 'Caída de servidor principal DB',
        categoryName: 'Redes',
        agentFullName: 'Ana Silva',
        minutesRemaining: 12,
      },
    ])
  })

  it('data is empty array when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useSlaAtRiskTickets())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual([])
  })

  it('sets error string when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useSlaAtRiskTickets())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.data).toEqual([])
  })

  it('refetches when limit param changes', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAtRiskRow], error: null })

    const { rerender } = renderHook(({ limit }) => useSlaAtRiskTickets(limit), {
      initialProps: { limit: 10 },
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(1)

    rerender({ limit: 20 })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledTimes(2)
    expect(mockRpc).toHaveBeenLastCalledWith('admin_get_sla_at_risk_tickets', { p_limit: 20 })
  })

  it('refetch() re-calls the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAtRiskRow], error: null })

    const { result } = renderHook(() => useSlaAtRiskTickets())

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
      renderHook(() => useSlaAtRiskTickets())
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(mockChannel).toHaveBeenCalledWith('sla-at-risk-tickets')
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
      const { unmount } = renderHook(() => useSlaAtRiskTickets())
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })

    it('a postgres_changes event calls the RPC with the LATEST limit, not the one captured at mount', async () => {
      mockRpc.mockResolvedValue({ data: [fakeAtRiskRow], error: null })
      const { rerender } = renderHook(({ limit }) => useSlaAtRiskTickets(limit), {
        initialProps: { limit: 10 },
      })
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0))
      })

      rerender({ limit: 20 })
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

      expect(mockRpc).toHaveBeenCalledWith('admin_get_sla_at_risk_tickets', { p_limit: 20 })
    })
  })
})
