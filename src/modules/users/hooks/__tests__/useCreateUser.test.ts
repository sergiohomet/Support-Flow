import { renderHook, act } from '@testing-library/react'
import { useCreateUser } from '../useCreateUser'
import type { CreateUserInput } from '../../schemas'

const mockInvoke = vi.fn()
vi.mock('@/core/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}))

const validInput: CreateUserInput = {
  fullName: 'Bob Jones',
  email: 'bob@example.com',
  temporaryPassword: 'secret1234',
  role: 'agent',
  specialty: null,
}

describe('useCreateUser', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ data: { userId: 'new-user-id' }, error: null })
  })

  it('execute(input) calls supabase.functions.invoke("create-user", { body: input })', async () => {
    const { result } = renderHook(() => useCreateUser())

    await act(async () => {
      await result.current.execute(validInput)
    })

    expect(mockInvoke).toHaveBeenCalledWith('create-user', { body: validInput })
  })

  it('sets isLoading true during call and false after completion', async () => {
    let resolveInvoke!: (val: unknown) => void
    mockInvoke.mockReturnValue(
      new Promise((res) => {
        resolveInvoke = res
      })
    )

    const { result } = renderHook(() => useCreateUser())

    let executePromise: Promise<boolean>
    act(() => {
      executePromise = result.current.execute(validInput)
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveInvoke({ data: { userId: 'new-user-id' }, error: null })
      await executePromise
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('returns true on success (response has userId)', async () => {
    const { result } = renderHook(() => useCreateUser())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute(validInput)
    })

    expect(returned).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns false and sets error when response contains { error: string }', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'Email already in use' }, error: null })

    const { result } = renderHook(() => useCreateUser())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute(validInput)
    })

    expect(returned).toBe(false)
    expect(result.current.error).toBe('Email already in use')
  })

  it('returns false and sets error on network/invoke failure', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Network error' } })

    const { result } = renderHook(() => useCreateUser())

    let returned: boolean | null = null
    await act(async () => {
      returned = await result.current.execute(validInput)
    })

    expect(returned).toBe(false)
    expect(result.current.error).toBe('Network error')
  })

  it('isLoading is false after error response', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Network error' } })

    const { result } = renderHook(() => useCreateUser())

    await act(async () => {
      await result.current.execute(validInput)
    })

    expect(result.current.isLoading).toBe(false)
  })
})
