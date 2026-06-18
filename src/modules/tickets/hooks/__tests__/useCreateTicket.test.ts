import { renderHook, act } from '@testing-library/react'
import { useCreateTicket } from '../useCreateTicket'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

describe('useCreateTicket', () => {
  beforeEach(() => {
    mockRpc.mockResolvedValue({ data: [{ id: 'ticket-new' }], error: null })
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [{ id: 'ticket-new' }], error: null })
  })

  it('execute(input) calls rpc("create_ticket") with correct params', async () => {
    const { result } = renderHook(() => useCreateTicket())

    await act(async () => {
      await result.current.execute({
        title: 'Mi problema',
        description: 'Descripción del problema',
        categoryId: 'cat-1',
        priority: 'alta',
      })
    })

    expect(mockRpc).toHaveBeenCalledWith('create_ticket', {
      p_title: 'Mi problema',
      p_description: 'Descripción del problema',
      p_category_id: 'cat-1',
      p_priority: 'alta',
    })
  })

  it('returns the new ticket id on success', async () => {
    const { result } = renderHook(() => useCreateTicket())

    let returnedId: string | null = null
    await act(async () => {
      returnedId = await result.current.execute({
        title: 'Mi problema',
        description: 'Descripción del problema',
        categoryId: 'cat-1',
        priority: 'media',
      })
    })

    expect(returnedId).toBe('ticket-new')
    expect(result.current.error).toBeNull()
  })

  it('returns null and sets error on rpc failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useCreateTicket())

    let returnedId: string | null = 'sentinel'
    await act(async () => {
      returnedId = await result.current.execute({
        title: 'Mi problema',
        description: 'Descripción del problema',
        categoryId: 'cat-1',
        priority: 'media',
      })
    })

    expect(returnedId).toBeNull()
    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('parseRpcError strips "unauthorized:" prefix from error message', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'unauthorized: Solo los clientes pueden crear tickets' },
    })

    const { result } = renderHook(() => useCreateTicket())

    await act(async () => {
      await result.current.execute({
        title: 'Mi problema',
        description: 'Descripción del problema',
        categoryId: 'cat-1',
        priority: 'media',
      })
    })

    expect(result.current.error).toBe('Solo los clientes pueden crear tickets')
  })

  it('clears error at the start of the next execute() call', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useCreateTicket())

    await act(async () => {
      await result.current.execute({
        title: 'Mi problema',
        description: 'Descripción del problema',
        categoryId: 'cat-1',
        priority: 'media',
      })
    })

    expect(result.current.error).not.toBeNull()

    mockRpc.mockResolvedValueOnce({ data: [{ id: 'ticket-new' }], error: null })

    await act(async () => {
      await result.current.execute({
        title: 'Otro problema',
        description: 'Descripción del segundo problema',
        categoryId: 'cat-2',
        priority: 'baja',
      })
    })

    expect(result.current.error).toBeNull()
  })

  it('isLoading is false after execute() completes (success)', async () => {
    const { result } = renderHook(() => useCreateTicket())

    await act(async () => {
      await result.current.execute({
        title: 'Mi problema',
        description: 'Descripción del problema',
        categoryId: 'cat-1',
        priority: 'media',
      })
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('isLoading is false after execute() completes (error)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useCreateTicket())

    await act(async () => {
      await result.current.execute({
        title: 'Mi problema',
        description: 'Descripción del problema',
        categoryId: 'cat-1',
        priority: 'media',
      })
    })

    expect(result.current.isLoading).toBe(false)
  })
})
