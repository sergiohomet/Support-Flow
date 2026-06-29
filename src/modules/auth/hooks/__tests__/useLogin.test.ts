import { renderHook, act } from '@testing-library/react'
import { useLogin } from '../useLogin'

const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

const mockSetUser = vi.fn()

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: { setUser: typeof mockSetUser }) => unknown) =>
    selector({ setUser: mockSetUser }),
  ),
}))

const fakeProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  full_name: 'Test User',
  role: 'client' as const,
  is_active: true,
}

describe('useLogin', () => {
  beforeEach(() => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })
    mockRpc.mockResolvedValue({ data: [fakeProfile], error: null })
    mockSetUser.mockReset()
    mockSignOut.mockReset()
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('happy path: calls signInWithPassword → rpc("get_my_profile") → setUser with profile', async () => {
    const { result } = renderHook(() => useLogin())

    await act(async () => {
      await result.current.execute({ email: 'user@example.com', password: 'password123' })
    })

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(mockRpc).toHaveBeenCalledWith('get_my_profile')
    expect(mockSetUser).toHaveBeenCalledWith({
      id: fakeProfile.id,
      email: fakeProfile.email,
      full_name: fakeProfile.full_name,
      role: fakeProfile.role,
    })
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('maps "Invalid login credentials" to Spanish error message', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: new Error('Invalid login credentials'),
    })

    const { result } = renderHook(() => useLogin())

    await act(async () => {
      await result.current.execute({ email: 'user@example.com', password: 'wrongpass' })
    })

    expect(result.current.error).toBe('Email o contraseña incorrectos')
    expect(mockSetUser).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('clears error when execute is called again after a previous error', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {},
      error: new Error('Invalid login credentials'),
    })

    const { result } = renderHook(() => useLogin())

    // First call — sets error
    await act(async () => {
      await result.current.execute({ email: 'user@example.com', password: 'wrongpass' })
    })

    expect(result.current.error).toBe('Email o contraseña incorrectos')

    // Second call — error should be cleared at start of execution
    mockSignInWithPassword.mockResolvedValueOnce({ data: {}, error: null })
    mockRpc.mockResolvedValueOnce({ data: [fakeProfile], error: null })

    await act(async () => {
      await result.current.execute({ email: 'user@example.com', password: 'correctpass' })
    })

    expect(result.current.error).toBeNull()
  })

  it('isLoading is false after execution completes', async () => {
    const { result } = renderHook(() => useLogin())

    await act(async () => {
      await result.current.execute({ email: 'user@example.com', password: 'password123' })
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('isLoading resets to false even on error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: new Error('Invalid login credentials'),
    })

    const { result } = renderHook(() => useLogin())

    await act(async () => {
      await result.current.execute({ email: 'user@example.com', password: 'wrongpass' })
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('inactive user: signs out and sets deactivation error, does not call setUser', async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...fakeProfile, is_active: false }],
      error: null,
    })

    const { result } = renderHook(() => useLogin())

    await act(async () => {
      await result.current.execute({ email: 'user@example.com', password: 'password123' })
    })

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('Tu cuenta está desactivada. Contactá al administrador.')
    expect(mockSetUser).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('active user (is_active: true): proceeds normally and calls setUser', async () => {
    mockRpc.mockResolvedValue({
      data: [{ ...fakeProfile, is_active: true }],
      error: null,
    })

    const { result } = renderHook(() => useLogin())

    await act(async () => {
      await result.current.execute({ email: 'user@example.com', password: 'password123' })
    })

    expect(mockSignOut).not.toHaveBeenCalled()
    expect(mockSetUser).toHaveBeenCalledWith({
      id: fakeProfile.id,
      email: fakeProfile.email,
      full_name: fakeProfile.full_name,
      role: fakeProfile.role,
    })
    expect(result.current.error).toBeNull()
  })
})
