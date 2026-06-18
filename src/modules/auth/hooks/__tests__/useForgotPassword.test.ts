import { renderHook, act } from '@testing-library/react'
import { useForgotPassword } from '../useForgotPassword'

const mockResetPasswordForEmail = vi.fn()
const mockUpdateUser = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}))

describe('useForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })
    mockSignOut.mockResolvedValue({ error: null })
    // jsdom sets window.location.origin to 'http://localhost'
  })

  describe('executeRequest', () => {
    it('calls resetPasswordForEmail with correct email and redirectTo', async () => {
      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeRequest('user@example.com')
      })

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
        redirectTo: `${window.location.origin}/forgot-password`,
      })
    })

    it('sets sent=true on success', async () => {
      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeRequest('user@example.com')
      })

      expect(result.current.sent).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('sets sent=true even when email is not found (anti-enumeration)', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: new Error('User not found'),
      })

      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeRequest('nonexistent@example.com')
      })

      expect(result.current.sent).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('sets error and sent=false for too_many_requests rate-limit error', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: new Error('too_many_requests'),
      })

      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeRequest('user@example.com')
      })

      expect(result.current.sent).toBe(false)
      expect(result.current.error).toBe('Demasiados intentos. Esperá unos minutos')
    })

    it('sets error and sent=false for "Email rate limit exceeded" (Supabase 429)', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: new Error('Email rate limit exceeded'),
      })

      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeRequest('user@example.com')
      })

      expect(result.current.sent).toBe(false)
      expect(result.current.error).toBe('Demasiados intentos. Esperá unos minutos')
    })

    it('sets error and sent=false for "over_email_send_rate_limit" (Supabase 429)', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: new Error('over_email_send_rate_limit'),
      })

      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeRequest('user@example.com')
      })

      expect(result.current.sent).toBe(false)
      expect(result.current.error).toBe('Demasiados intentos. Esperá unos minutos')
    })

    it('sets error and sent=false for raw "429" in error message', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: new Error('Request failed with status 429'),
      })

      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeRequest('user@example.com')
      })

      expect(result.current.sent).toBe(false)
      expect(result.current.error).toBe('Demasiados intentos. Esperá unos minutos')
    })

    it('resets isLoading to false after executeRequest', async () => {
      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeRequest('user@example.com')
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('executeReset', () => {
    it('calls updateUser with the new password', async () => {
      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeReset('newSecurePassword123')
      })

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecurePassword123' })
    })

    it('returns true on success', async () => {
      const { result } = renderHook(() => useForgotPassword())

      let returnValue: boolean | undefined
      await act(async () => {
        returnValue = await result.current.executeReset('newSecurePassword123')
      })

      expect(returnValue).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('calls signOut after successful updateUser', async () => {
      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeReset('newSecurePassword123')
      })

      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })

    it('does not call signOut when updateUser fails', async () => {
      mockUpdateUser.mockResolvedValue({
        data: {},
        error: new Error('Token has expired'),
      })

      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeReset('newSecurePassword123')
      })

      expect(mockSignOut).not.toHaveBeenCalled()
    })

    it('returns false on error', async () => {
      mockUpdateUser.mockResolvedValue({
        data: {},
        error: new Error('Token has expired'),
      })

      const { result } = renderHook(() => useForgotPassword())

      let returnValue: boolean | undefined
      await act(async () => {
        returnValue = await result.current.executeReset('newSecurePassword123')
      })

      expect(returnValue).toBe(false)
      expect(result.current.error).not.toBeNull()
    })

    it('sets no error on success', async () => {
      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeReset('newSecurePassword123')
      })

      expect(result.current.error).toBeNull()
    })

    it('maps updateUser error to Spanish', async () => {
      mockUpdateUser.mockResolvedValue({
        data: {},
        error: new Error('same_password'),
      })

      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeReset('sameOldPassword')
      })

      expect(result.current.error).toBe('La nueva contraseña debe ser diferente a la actual')
    })

    it('resets isLoading to false after executeReset', async () => {
      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeReset('newSecurePassword123')
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('resets isLoading to false even on error', async () => {
      mockUpdateUser.mockResolvedValue({
        data: {},
        error: new Error('Token has expired'),
      })

      const { result } = renderHook(() => useForgotPassword())

      await act(async () => {
        await result.current.executeReset('newSecurePassword123')
      })

      expect(result.current.isLoading).toBe(false)
    })
  })
})
