import { renderHook, act } from '@testing-library/react'
import { useAuthBootstrap } from '../useAuthBootstrap'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUnsubscribe = vi.fn()
const mockRpc = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockSetUser = vi.fn()
const mockSetAuthReady = vi.fn()

vi.mock('@/store', () => ({
  useStore: (selector: (s: { setUser: typeof mockSetUser; setAuthReady: typeof mockSetAuthReady }) => unknown) =>
    selector({ setUser: mockSetUser, setAuthReady: mockSetAuthReady }),
}))

const fakeProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  full_name: 'Test User',
  role: 'client' as const,
  is_active: true,
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('useAuthBootstrap', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockOnAuthStateChange.mockReset()
    mockUnsubscribe.mockReset()
    mockRpc.mockReset()
    mockSignOut.mockReset()
    mockNavigate.mockReset()
    mockSetUser.mockReset()
    mockSetAuthReady.mockReset()
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } })
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('restores the session on mount and loads the profile when a session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: fakeProfile.id } } } })
    mockRpc.mockResolvedValue({ data: [fakeProfile], error: null })

    renderHook(() => useAuthBootstrap())
    await flush()

    expect(mockRpc).toHaveBeenCalledWith('get_my_profile')
    expect(mockSetUser).toHaveBeenCalledWith({
      id: fakeProfile.id,
      email: fakeProfile.email,
      full_name: fakeProfile.full_name,
      role: fakeProfile.role,
    })
    expect(mockSetAuthReady).toHaveBeenCalledWith(true)
  })

  it('sets user to null and marks auth ready when there is no session on mount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    renderHook(() => useAuthBootstrap())
    await flush()

    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockSetUser).toHaveBeenCalledWith(null)
    expect(mockSetAuthReady).toHaveBeenCalledWith(true)
  })

  it('forces sign-out and sets user to null when the profile is inactive', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: fakeProfile.id } } } })
    mockRpc.mockResolvedValue({ data: [{ ...fakeProfile, is_active: false }], error: null })

    renderHook(() => useAuthBootstrap())
    await flush()

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockSetUser).toHaveBeenCalledWith(null)
    expect(mockSetAuthReady).toHaveBeenCalledWith(true)
  })

  it('marks auth ready even when profile loading fails after mount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: fakeProfile.id } } } })
    mockRpc.mockResolvedValue({ data: null, error: new Error('boom') })

    renderHook(() => useAuthBootstrap())
    await flush()

    expect(mockSetUser).toHaveBeenCalledWith(null)
    expect(mockSetAuthReady).toHaveBeenCalledWith(true)
  })

  it('loads the profile on SIGNED_IN event', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockRpc.mockResolvedValue({ data: [fakeProfile], error: null })

    renderHook(() => useAuthBootstrap())
    await flush()

    const handler = mockOnAuthStateChange.mock.calls[0][0] as (event: string) => Promise<void>
    await act(async () => {
      await handler('SIGNED_IN')
    })

    expect(mockSetUser).toHaveBeenCalledWith({
      id: fakeProfile.id,
      email: fakeProfile.email,
      full_name: fakeProfile.full_name,
      role: fakeProfile.role,
    })
  })

  it('sets user to null on SIGNED_OUT event', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    renderHook(() => useAuthBootstrap())
    await flush()
    mockSetUser.mockClear()

    const handler = mockOnAuthStateChange.mock.calls[0][0] as (event: string) => Promise<void>
    await act(async () => {
      await handler('SIGNED_OUT')
    })

    expect(mockSetUser).toHaveBeenCalledWith(null)
  })

  it('navigates to /forgot-password on PASSWORD_RECOVERY event', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    renderHook(() => useAuthBootstrap())
    await flush()

    const handler = mockOnAuthStateChange.mock.calls[0][0] as (event: string) => Promise<void>
    await act(async () => {
      await handler('PASSWORD_RECOVERY')
    })

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password')
  })

  it('unsubscribes from auth state changes on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { unmount } = renderHook(() => useAuthBootstrap())
    await flush()

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})
