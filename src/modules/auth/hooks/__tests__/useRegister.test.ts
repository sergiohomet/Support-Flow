import { renderHook, act } from '@testing-library/react'
import { useRegister } from '../useRegister'

const mockSignUp = vi.fn()

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  },
}))

describe('useRegister', () => {
  beforeEach(() => {
    mockSignUp.mockResolvedValue({ data: {}, error: null })
  })

  it('calls signUp with correct shape — email, password, full_name in options.data', async () => {
    const { result } = renderHook(() => useRegister())

    await act(async () => {
      await result.current.execute({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'John Doe',
      })
    })

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { full_name: 'John Doe' },
      },
    })
  })

  it('sets success=true and error=null on happy path', async () => {
    const { result } = renderHook(() => useRegister())

    await act(async () => {
      await result.current.execute({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'John Doe',
      })
    })

    expect(result.current.success).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('maps "User already registered" error to Spanish', async () => {
    mockSignUp.mockResolvedValue({
      data: {},
      error: new Error('User already registered'),
    })

    const { result } = renderHook(() => useRegister())

    await act(async () => {
      await result.current.execute({
        email: 'existing@example.com',
        password: 'password123',
        full_name: 'John Doe',
      })
    })

    expect(result.current.error).toBe('Ya existe una cuenta con este email')
    expect(result.current.success).toBe(false)
  })

  it('does NOT include role field in the signUp call', async () => {
    const { result } = renderHook(() => useRegister())

    await act(async () => {
      await result.current.execute({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'John Doe',
      })
    })

    const callArg = mockSignUp.mock.calls[0][0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('role')
    expect((callArg.options as { data: Record<string, unknown> })?.data).not.toHaveProperty('role')
  })

  it('resets isLoading to false on error', async () => {
    mockSignUp.mockResolvedValue({
      data: {},
      error: new Error('User already registered'),
    })

    const { result } = renderHook(() => useRegister())

    await act(async () => {
      await result.current.execute({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'John Doe',
      })
    })

    expect(result.current.isLoading).toBe(false)
  })
})
