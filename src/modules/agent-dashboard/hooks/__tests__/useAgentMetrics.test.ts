import { renderHook, act } from '@testing-library/react'
import { useAgentMetrics } from '../useAgentMetrics'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

describe('useAgentMetrics', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('does not call rpc when agentId is null', async () => {
    renderHook(() => useAgentMetrics(null))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls agent_get_my_metrics scoped to the agent when agentId is set', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          assigned_count: 3,
          resolved_this_month: 10,
          sla_compliance_pct: 85.5,
          avg_resolution_hours: 4.2,
        },
      ],
      error: null,
    })

    renderHook(() => useAgentMetrics('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockRpc).toHaveBeenCalledWith('agent_get_my_metrics', {
      p_agent_id: 'agent-1',
    })
  })

  it('returns mapped metrics data on success', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          assigned_count: 3,
          resolved_this_month: 10,
          sla_compliance_pct: 85.5,
          avg_resolution_hours: 4.2,
        },
      ],
      error: null,
    })

    const { result } = renderHook(() => useAgentMetrics('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual({
      assignedCount: 3,
      resolvedThisMonth: 10,
      slaCompliancePct: 85.5,
      avgResolutionHours: 4.2,
    })
    expect(result.current.error).toBeNull()
  })

  it('returns zeroed metrics when RPC returns empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useAgentMetrics('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.data).toEqual({
      assignedCount: 0,
      resolvedThisMonth: 0,
      slaCompliancePct: 0,
      avgResolutionHours: 0,
    })
  })

  it('sets error when RPC fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'unauthorized: Solo agentes' },
    })

    const { result } = renderHook(() => useAgentMetrics('agent-1'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.error).toBe('Solo agentes')
    expect(result.current.data).toBeNull()
  })
})
