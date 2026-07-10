import { renderHook, act } from '@testing-library/react'
import { useRecoveryPhase } from '../useRecoveryPhase'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUnsubscribe = vi.fn()

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}))

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('useRecoveryPhase', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockOnAuthStateChange.mockReset()
    mockUnsubscribe.mockReset()
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } })
  })

  it('stays on "request" when there is no existing session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { result } = renderHook(() => useRecoveryPhase())
    await flush()

    expect(result.current).toBe('request')
  })

  it('switches to "reset" when a session already exists on mount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null })

    const { result } = renderHook(() => useRecoveryPhase())
    await flush()

    expect(result.current).toBe('reset')
  })

  it('switches to "reset" when a PASSWORD_RECOVERY event fires', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { result } = renderHook(() => useRecoveryPhase())
    await flush()
    expect(result.current).toBe('request')

    const onAuthStateChangeHandler = mockOnAuthStateChange.mock.calls[0][0] as (event: string) => void
    act(() => {
      onAuthStateChangeHandler('PASSWORD_RECOVERY')
    })

    expect(result.current).toBe('reset')
  })

  it('ignores unrelated auth events', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { result } = renderHook(() => useRecoveryPhase())
    await flush()

    const onAuthStateChangeHandler = mockOnAuthStateChange.mock.calls[0][0] as (event: string) => void
    act(() => {
      onAuthStateChangeHandler('SIGNED_IN')
    })

    expect(result.current).toBe('request')
  })

  it('unsubscribes on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { unmount } = renderHook(() => useRecoveryPhase())
    await flush()

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})
