import { renderHook, act } from '@testing-library/react'
import { useTicketDetail } from '../useTicketDetail'

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

vi.mock('@/store', () => ({
  useStore: (selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 'current-user' } }),
}))

const fakeDetail = {
  id: 'ticket-1',
  title: 'Test',
  description: 'Desc',
  status: 'abierto',
  priority: 'media',
  category_id: 'cat-1',
  category_name: 'Soporte',
  category_is_active: true,
  client_id: 'user-1',
  client_full_name: 'Juan',
  agent_id: null,
  agent_full_name: null,
  ai_triage: null,
  created_at: '2026-06-15T10:00:00Z',
  updated_at: '2026-06-15T10:00:00Z',
}

const fakeComment = {
  id: 'c-1',
  ticket_id: 'ticket-1',
  user_id: 'user-1',
  user_full_name: 'Juan',
  content: 'Hola',
  created_at: '2026-06-15T10:00:00Z',
}

const fakeLog = {
  id: 'log-1',
  ticket_id: 'ticket-1',
  from_status: null,
  to_status: 'abierto',
  changed_by: 'user-1',
  changed_by_full_name: 'Juan',
  changed_at: '2026-06-15T10:00:00Z',
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('useTicketDetail', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === 'get_ticket_detail') return Promise.resolve({ data: [fakeDetail], error: null })
      if (rpcName === 'get_ticket_comments') return Promise.resolve({ data: [fakeComment], error: null })
      if (rpcName === 'get_ticket_status_log') return Promise.resolve({ data: [fakeLog], error: null })
      return Promise.resolve({ data: [], error: null })
    })

    mockOn.mockReset()
    mockSubscribe.mockReset()
    mockChannel.mockReset()
    mockRemoveChannel.mockReset()

    mockOn.mockReturnValue({ subscribe: mockSubscribe })
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() })
    mockChannel.mockReturnValue({ on: mockOn })
  })

  describe('auto-fetch on ticketId', () => {
    it('does not fetch when ticketId is undefined', async () => {
      renderHook(() => useTicketDetail(undefined))
      await flush()

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('sets ticket with camelCase mapping on mount', async () => {
      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(result.current.ticket).toMatchObject({
        id: 'ticket-1',
        title: 'Test',
        categoryId: 'cat-1',
        agentId: null,
      })
    })

    it('maps category_is_active: true → categoryIsActive: true', async () => {
      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(result.current.ticket?.categoryIsActive).toBe(true)
    })

    it('maps category_is_active: false → categoryIsActive: false', async () => {
      mockRpc.mockImplementation((rpcName: string) => {
        if (rpcName === 'get_ticket_detail')
          return Promise.resolve({ data: [{ ...fakeDetail, category_is_active: false }], error: null })
        if (rpcName === 'get_ticket_comments') return Promise.resolve({ data: [fakeComment], error: null })
        if (rpcName === 'get_ticket_status_log') return Promise.resolve({ data: [fakeLog], error: null })
        return Promise.resolve({ data: [], error: null })
      })

      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(result.current.ticket?.categoryIsActive).toBe(false)
    })

    it('sets comments with camelCase mapping', async () => {
      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(result.current.comments).toEqual([
        {
          id: 'c-1',
          ticketId: 'ticket-1',
          userId: 'user-1',
          userFullName: 'Juan',
          content: 'Hola',
          createdAt: '2026-06-15T10:00:00Z',
        },
      ])
    })

    it('sets statusLog with fromStatus: null', async () => {
      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(result.current.statusLog).toEqual([
        {
          id: 'log-1',
          ticketId: 'ticket-1',
          fromStatus: null,
          toStatus: 'abierto',
          changedBy: 'user-1',
          changedByFullName: 'Juan',
          changedAt: '2026-06-15T10:00:00Z',
        },
      ])
    })

    it('sets error when get_ticket_detail returns an error', async () => {
      mockRpc.mockImplementation((rpcName: string) => {
        if (rpcName === 'get_ticket_detail') return Promise.resolve({ data: null, error: { message: 'Access denied' } })
        if (rpcName === 'get_ticket_comments') return Promise.resolve({ data: [], error: null })
        if (rpcName === 'get_ticket_status_log') return Promise.resolve({ data: [], error: null })
        return Promise.resolve({ data: [], error: null })
      })

      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(result.current.error).toBe('Access denied')
      expect(result.current.ticket).toBeNull()
    })

    it('sets error when detail returns empty array (ticket not found)', async () => {
      mockRpc.mockImplementation((rpcName: string) => {
        if (rpcName === 'get_ticket_detail') return Promise.resolve({ data: [], error: null })
        if (rpcName === 'get_ticket_comments') return Promise.resolve({ data: [], error: null })
        if (rpcName === 'get_ticket_status_log') return Promise.resolve({ data: [], error: null })
        return Promise.resolve({ data: [], error: null })
      })

      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(result.current.error).toBe('Ticket not found or access denied.')
      expect(result.current.ticket).toBeNull()
    })

    it('isLoading is false after the mount fetch completes', async () => {
      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(result.current.isLoading).toBe(false)
    })

    it('refetches when ticketId changes', async () => {
      const { rerender } = renderHook(({ ticketId }) => useTicketDetail(ticketId), {
        initialProps: { ticketId: 'ticket-1' },
      })
      await flush()

      expect(mockRpc).toHaveBeenCalledWith('get_ticket_detail', { p_ticket_id: 'ticket-1' })

      mockRpc.mockClear()
      rerender({ ticketId: 'ticket-2' })
      await flush()

      expect(mockRpc).toHaveBeenCalledWith('get_ticket_detail', { p_ticket_id: 'ticket-2' })
    })
  })

  describe('refetch() (manual re-invocation)', () => {
    it('re-calls the RPCs for the same ticketId', async () => {
      const { result } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      mockRpc.mockClear()
      await act(async () => {
        await result.current.refetch()
      })

      expect(mockRpc).toHaveBeenCalledWith('get_ticket_detail', { p_ticket_id: 'ticket-1' })
    })

    it('is a no-op when ticketId is undefined', async () => {
      const { result } = renderHook(() => useTicketDetail(undefined))
      await flush()

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe('realtime subscription', () => {
    it('subscribes to a channel scoped to the ticket id after the ticket loads', async () => {
      renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      expect(mockChannel).toHaveBeenCalledWith('ticket-comments-ticket-1')
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_comments',
          filter: 'ticket_id=eq.ticket-1',
        }),
        expect.any(Function)
      )
      expect(mockSubscribe).toHaveBeenCalledTimes(1)
    })

    it('removes the channel on unmount', async () => {
      const { unmount } = renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      unmount()

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    })

    it('triggers a refetch when an INSERT comes from another user', async () => {
      renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      mockRpc.mockClear()
      const insertHandler = mockOn.mock.calls[0][2] as (payload: { new: { user_id: string } }) => void

      await act(async () => {
        insertHandler({ new: { user_id: 'other-user' } })
        await Promise.resolve()
      })

      expect(mockRpc).toHaveBeenCalled()
    })

    it('does NOT trigger a refetch when an INSERT comes from the current user', async () => {
      renderHook(() => useTicketDetail('ticket-1'))
      await flush()

      mockRpc.mockClear()
      const insertHandler = mockOn.mock.calls[0][2] as (payload: { new: { user_id: string } }) => void

      await act(async () => {
        insertHandler({ new: { user_id: 'current-user' } })
        await Promise.resolve()
      })

      expect(mockRpc).not.toHaveBeenCalled()
    })
  })
})
