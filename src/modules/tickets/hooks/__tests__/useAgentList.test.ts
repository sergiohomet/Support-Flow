import { renderHook, act } from '@testing-library/react'
import { useAgentList } from '../useAgentList'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const mockSetAgents = vi.fn()

let mockGetStateReturn = {
  agents: [] as unknown[],
}

vi.mock('@/store', () => ({
  useStore: Object.assign(
    vi.fn((selector: (s: unknown) => unknown) => selector({ setAgents: mockSetAgents })),
    { getState: vi.fn(() => mockGetStateReturn) }
  ),
}))

const fakeAgentRow = { id: 'agent-1', full_name: 'Ana García', category_id: 'cat-1', category_name: 'Redes', active_ticket_count: 2 }

describe('useAgentList', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockSetAgents.mockReset()
    mockGetStateReturn = { agents: [] }
  })

  it('loadAgents() calls rpc("get_agents") and setAgents when agents is empty', async () => {
    mockRpc.mockResolvedValue({ data: [fakeAgentRow], error: null })

    const { result } = renderHook(() => useAgentList())

    await act(async () => {
      await result.current.loadAgents()
    })

    expect(mockRpc).toHaveBeenCalledWith('get_agents')
    expect(mockSetAgents).toHaveBeenCalledWith([
      { id: 'agent-1', fullName: 'Ana García', categoryId: 'cat-1', categoryName: 'Redes', activeTicketCount: 2 },
    ])
  })

  it('loadAgents() maps full_name → fullName and active_ticket_count → activeTicketCount', async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 'agent-2', full_name: 'Carlos López', category_id: null, category_name: null, active_ticket_count: 0 }],
      error: null,
    })

    const { result } = renderHook(() => useAgentList())

    await act(async () => {
      await result.current.loadAgents()
    })

    expect(mockSetAgents).toHaveBeenCalledWith([
      { id: 'agent-2', fullName: 'Carlos López', categoryId: null, categoryName: null, activeTicketCount: 0 },
    ])
  })

  it('loadAgents() does NOT call rpc when agents is already populated', async () => {
    mockGetStateReturn.agents = [fakeAgentRow]

    const { result } = renderHook(() => useAgentList())

    await act(async () => {
      await result.current.loadAgents()
    })

    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockSetAgents).not.toHaveBeenCalled()
  })

  it('sets error when rpc returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useAgentList())

    await act(async () => {
      await result.current.loadAgents()
    })

    expect(result.current.error).toBe('DB error')
    expect(mockSetAgents).not.toHaveBeenCalled()
  })
})
