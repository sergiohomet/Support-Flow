import { renderHook, act } from '@testing-library/react'
import { useCategoryList } from '../useCategoryList'

const mockRpc = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

const mockSetCategories = vi.fn()

let mockGetStateReturn = {
  categories: [] as unknown[],
}

vi.mock('@/store', () => ({
  useStore: Object.assign(
    vi.fn((selector: (s: unknown) => unknown) => selector({ setCategories: mockSetCategories })),
    { getState: vi.fn(() => mockGetStateReturn) }
  ),
}))

const fakeCategoryRow = { id: 'cat-1', name: 'Soporte', description: null }

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('useCategoryList', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockSetCategories.mockReset()
    mockGetStateReturn = { categories: [] }
  })

  describe('auto-fetch on mount', () => {
    it('calls rpc("get_categories") and setCategories when categories is empty', async () => {
      mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

      renderHook(() => useCategoryList())
      await flush()

      expect(mockRpc).toHaveBeenCalledWith('get_categories')
      expect(mockSetCategories).toHaveBeenCalledWith([
        { id: 'cat-1', name: 'Soporte', description: null },
      ])
    })

    it('does NOT call rpc when categories is already populated', async () => {
      mockGetStateReturn.categories = [fakeCategoryRow]

      renderHook(() => useCategoryList())
      await flush()

      expect(mockRpc).not.toHaveBeenCalled()
      expect(mockSetCategories).not.toHaveBeenCalled()
    })

    it('sets error when rpc returns an error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

      const { result } = renderHook(() => useCategoryList())
      await flush()

      expect(result.current.error).toBe('DB error')
      expect(mockSetCategories).not.toHaveBeenCalled()
    })

    it('isLoadingCategories is false after the mount fetch completes', async () => {
      const { result } = renderHook(() => useCategoryList())
      await flush()

      expect(result.current.isLoadingCategories).toBe(false)
    })
  })

  describe('loadCategories() (manual re-invocation)', () => {
    it('calls rpc("get_categories") and setCategories when categories is empty', async () => {
      mockRpc.mockResolvedValue({ data: [fakeCategoryRow], error: null })

      const { result } = renderHook(() => useCategoryList())
      await flush()
      mockRpc.mockClear()
      mockSetCategories.mockClear()

      await act(async () => {
        await result.current.loadCategories()
      })

      expect(mockRpc).toHaveBeenCalledWith('get_categories')
      expect(mockSetCategories).toHaveBeenCalledWith([
        { id: 'cat-1', name: 'Soporte', description: null },
      ])
    })

    it('does NOT call rpc when categories is already populated', async () => {
      mockGetStateReturn.categories = [fakeCategoryRow]

      const { result } = renderHook(() => useCategoryList())
      await flush()

      await act(async () => {
        await result.current.loadCategories()
      })

      expect(mockRpc).not.toHaveBeenCalled()
      expect(mockSetCategories).not.toHaveBeenCalled()
    })
  })
})
