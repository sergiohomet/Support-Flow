import { renderHook, act } from '@testing-library/react'
import { useAcceptAiTriage } from '../useAcceptAiTriage'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useAcceptAiTriage', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  describe('acceptCategory', () => {
    it('calls rpc("accept_ai_triage_category") with correct params', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', category_id: 'cat-1', updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.acceptCategory('ticket-1', 'cat-1')
      })

      expect(mockRpc).toHaveBeenCalledWith('accept_ai_triage_category', {
        p_ticket_id: 'ticket-1',
        p_category_id: 'cat-1',
      })
    })

    it('resolves true on success', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', category_id: 'cat-1', updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.acceptCategory('ticket-1', 'cat-1')
      })

      expect(returned).toBe(true)
      expect(result.current.categoryError).toBeNull()
    })

    it('resolves false and sets categoryError on rpc failure', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'not_found: Ticket not found' } })

      const { result } = renderHook(() => useAcceptAiTriage())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.acceptCategory('ticket-1', 'cat-1')
      })

      expect(returned).toBe(false)
      expect(result.current.categoryError).toBe('Ticket not found')
    })

    it('isAcceptingCategory is false after the call completes', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', category_id: 'cat-1', updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.acceptCategory('ticket-1', 'cat-1')
      })

      expect(result.current.isAcceptingCategory).toBe(false)
    })
  })

  describe('acceptPriority', () => {
    it('calls rpc("accept_ai_triage_priority") with correct params', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', priority: 'alta', updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.acceptPriority('ticket-1', 'alta')
      })

      expect(mockRpc).toHaveBeenCalledWith('accept_ai_triage_priority', {
        p_ticket_id: 'ticket-1',
        p_priority: 'alta',
      })
    })

    it('resolves true on success', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', priority: 'alta', updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.acceptPriority('ticket-1', 'alta')
      })

      expect(returned).toBe(true)
      expect(result.current.priorityError).toBeNull()
    })

    it('resolves false and sets priorityError on rpc failure', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'unauthorized: Not allowed' } })

      const { result } = renderHook(() => useAcceptAiTriage())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.acceptPriority('ticket-1', 'alta')
      })

      expect(returned).toBe(false)
      expect(result.current.priorityError).toBe('Not allowed')
    })

    it('isAcceptingPriority is false after the call completes', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', priority: 'alta', updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.acceptPriority('ticket-1', 'alta')
      })

      expect(result.current.isAcceptingPriority).toBe(false)
    })
  })

  describe('dismissTriage', () => {
    it('calls rpc("dismiss_ai_triage") with correct params', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', ai_triage: null, updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.dismissTriage('ticket-1')
      })

      expect(mockRpc).toHaveBeenCalledWith('dismiss_ai_triage', { p_ticket_id: 'ticket-1' })
    })

    it('resolves true on success', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', ai_triage: null, updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.dismissTriage('ticket-1')
      })

      expect(returned).toBe(true)
      expect(result.current.dismissError).toBeNull()
    })

    it('resolves false and sets dismissError on rpc failure', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'not_found: Ticket not found' } })

      const { result } = renderHook(() => useAcceptAiTriage())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.dismissTriage('ticket-1')
      })

      expect(returned).toBe(false)
      expect(result.current.dismissError).toBe('Ticket not found')
    })

    it('isDismissing is false after the call completes', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'ticket-1', ai_triage: null, updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.dismissTriage('ticket-1')
      })

      expect(result.current.isDismissing).toBe(false)
    })

    it('does not affect categoryError/priorityError', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'not_found: Ticket not found' } })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.dismissTriage('ticket-1')
      })

      expect(result.current.dismissError).toBe('Ticket not found')
      expect(result.current.categoryError).toBeNull()
      expect(result.current.priorityError).toBeNull()
    })
  })

  describe('independence between acceptCategory and acceptPriority', () => {
    it('a category error does not affect priorityError', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'not_found: Ticket not found' } })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.acceptCategory('ticket-1', 'cat-1')
      })

      expect(result.current.categoryError).toBe('Ticket not found')
      expect(result.current.priorityError).toBeNull()
    })

    it('a successful acceptPriority does not clear a prior categoryError', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'not_found: Ticket not found' } })
      mockRpc.mockResolvedValueOnce({ data: [{ id: 'ticket-1', priority: 'alta', updated_at: '2026-07-14T10:00:00Z' }], error: null })

      const { result } = renderHook(() => useAcceptAiTriage())

      await act(async () => {
        await result.current.acceptCategory('ticket-1', 'cat-1')
      })
      expect(result.current.categoryError).toBe('Ticket not found')

      await act(async () => {
        await result.current.acceptPriority('ticket-1', 'alta')
      })

      expect(result.current.priorityError).toBeNull()
      expect(result.current.categoryError).toBe('Ticket not found')
    })

    it('isAcceptingCategory and isAcceptingPriority track independently while both are in flight', async () => {
      let resolveCategory!: (v: { data: unknown; error: null }) => void
      let resolvePriority!: (v: { data: unknown; error: null }) => void

      mockRpc.mockImplementation((rpcName: string) => {
        if (rpcName === 'accept_ai_triage_category') {
          return new Promise((resolve) => {
            resolveCategory = resolve
          })
        }
        return new Promise((resolve) => {
          resolvePriority = resolve
        })
      })

      const { result } = renderHook(() => useAcceptAiTriage())

      let categoryPromise!: Promise<boolean>
      let priorityPromise!: Promise<boolean>
      act(() => {
        categoryPromise = result.current.acceptCategory('ticket-1', 'cat-1')
        priorityPromise = result.current.acceptPriority('ticket-1', 'alta')
      })

      expect(result.current.isAcceptingCategory).toBe(true)
      expect(result.current.isAcceptingPriority).toBe(true)

      await act(async () => {
        resolvePriority({ data: [{ id: 'ticket-1', priority: 'alta', updated_at: '2026-07-14T10:00:00Z' }], error: null })
        await priorityPromise
      })

      expect(result.current.isAcceptingPriority).toBe(false)
      expect(result.current.isAcceptingCategory).toBe(true)

      await act(async () => {
        resolveCategory({ data: [{ id: 'ticket-1', category_id: 'cat-1', updated_at: '2026-07-14T10:00:00Z' }], error: null })
        await categoryPromise
      })

      expect(result.current.isAcceptingCategory).toBe(false)
    })
  })
})
