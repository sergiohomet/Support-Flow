import { renderHook, act } from '@testing-library/react'
import { useListUsers } from '../useListUsers'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const fakeUserRow = {
  id: 'user-1',
  email: 'alice@example.com',
  full_name: 'Alice Smith',
  avatar_url: 'https://example.com/avatar.png',
  role: 'agent',
  category_id: 'cat-1',
  category_name: 'Networking',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  total_count: 42,
}

describe('useListUsers', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('calls rpc("admin_list_users") with correct default params on fetch()', async () => {
    mockRpc.mockResolvedValue({ data: [fakeUserRow], error: null })

    const { result } = renderHook(() => useListUsers())

    await act(async () => {
      await result.current.fetch({})
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_list_users', {
      p_page: 1,
      p_page_size: 10,
    })
  })

  it('maps snake_case to camelCase in returned users', async () => {
    mockRpc.mockResolvedValue({ data: [fakeUserRow], error: null })

    const { result } = renderHook(() => useListUsers())

    await act(async () => {
      await result.current.fetch({})
    })

    expect(result.current.users).toEqual([
      {
        id: 'user-1',
        email: 'alice@example.com',
        fullName: 'Alice Smith',
        avatarUrl: 'https://example.com/avatar.png',
        role: 'agent',
        categoryId: 'cat-1',
        categoryName: 'Networking',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])
  })

  it('sets isFetching true during call and false after resolution', async () => {
    let resolveRpc!: (val: unknown) => void
    mockRpc.mockReturnValue(
      new Promise((res) => {
        resolveRpc = res
      })
    )

    const { result } = renderHook(() => useListUsers())

    let fetchPromise: Promise<void>
    act(() => {
      fetchPromise = result.current.fetch({})
    })

    expect(result.current.isFetching).toBe(true)

    await act(async () => {
      resolveRpc({ data: [], error: null })
      await fetchPromise
    })

    expect(result.current.isFetching).toBe(false)
  })

  it('extracts total_count from first row and exposes as totalCount', async () => {
    mockRpc.mockResolvedValue({ data: [fakeUserRow], error: null })

    const { result } = renderHook(() => useListUsers())

    await act(async () => {
      await result.current.fetch({})
    })

    expect(result.current.totalCount).toBe(42)
  })

  it('totalCount is 0 when data is empty', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useListUsers())

    await act(async () => {
      await result.current.fetch({})
    })

    expect(result.current.totalCount).toBe(0)
  })

  it('sets error string when RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useListUsers())

    await act(async () => {
      await result.current.fetch({})
    })

    expect(result.current.error).toBe('Error al procesar la solicitud. Intentá de nuevo.')
    expect(result.current.users).toEqual([])
  })

  it('passes all filter params correctly to rpc', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useListUsers())

    await act(async () => {
      await result.current.fetch({
        search: 'alice',
        role: 'agent',
        isActive: false,
        page: 2,
        pageSize: 25,
      })
    })

    expect(mockRpc).toHaveBeenCalledWith('admin_list_users', {
      p_search: 'alice',
      p_role: 'agent',
      p_is_active: false,
      p_page: 2,
      p_page_size: 25,
    })
  })
})
