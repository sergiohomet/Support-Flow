import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ForgotPasswordPage } from '../ForgotPasswordPage'

// --- hook mock ---
const mockExecuteRequest = vi.fn()
const mockExecuteReset = vi.fn()
let mockSent = false
let mockError: string | null = null

vi.mock('@/modules/auth/hooks/useForgotPassword', () => ({
  useForgotPassword: () => ({
    executeRequest: (...args: unknown[]) => mockExecuteRequest(...args),
    executeReset: (...args: unknown[]) => mockExecuteReset(...args),
    isLoading: false,
    get error() {
      return mockError
    },
    get sent() {
      return mockSent
    },
  }),
}))

// --- supabase mock ---
const mockGetSession = vi.fn()

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

// --- react-router navigate mock ---
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockExecuteRequest.mockReset()
    mockExecuteRequest.mockResolvedValue(undefined)
    mockExecuteReset.mockReset()
    mockExecuteReset.mockResolvedValue(true)
    mockNavigate.mockReset()
    mockGetSession.mockReset()
    mockSent = false
    mockError = null
    // Default: no session → request phase
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  })

  it('renders request phase by default when no session exists', async () => {
    renderPage()
    // Wait for the async getSession effect to settle
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enviar enlace/i })).toBeInTheDocument()
    })
    expect(screen.getByText('Recuperar contraseña')).toBeInTheDocument()
  })

  it('renders reset phase when a session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /guardar nueva contraseña/i })).toBeInTheDocument()
  })

  it('calls executeRequest when request form is submitted', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enviar enlace/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace/i }))

    await waitFor(() => {
      expect(mockExecuteRequest).toHaveBeenCalledWith('user@example.com')
    })
  })

  it('calls executeReset when reset form is submitted', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardar nueva contraseña/i })).toBeInTheDocument()
    })

    const passwordInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(passwordInputs[0], { target: { value: 'newpassword1' } })
    fireEvent.change(passwordInputs[1], { target: { value: 'newpassword1' } })

    fireEvent.click(screen.getByRole('button', { name: /guardar nueva contraseña/i }))

    await waitFor(() => {
      expect(mockExecuteReset).toHaveBeenCalledWith('newpassword1')
    })
  })

  it('navigates to /login with message after successful reset', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })
    mockExecuteReset.mockResolvedValue(true)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardar nueva contraseña/i })).toBeInTheDocument()
    })

    const passwordInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(passwordInputs[0], { target: { value: 'newpassword1' } })
    fireEvent.change(passwordInputs[1], { target: { value: 'newpassword1' } })

    fireEvent.click(screen.getByRole('button', { name: /guardar nueva contraseña/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { message: 'Contraseña actualizada. Podés iniciar sesión.' },
      })
    })
  })

  it('does not navigate when executeReset returns false (error case)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })
    mockExecuteReset.mockResolvedValue(false)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardar nueva contraseña/i })).toBeInTheDocument()
    })

    const passwordInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(passwordInputs[0], { target: { value: 'newpassword1' } })
    fireEvent.change(passwordInputs[1], { target: { value: 'newpassword1' } })

    fireEvent.click(screen.getByRole('button', { name: /guardar nueva contraseña/i }))

    await waitFor(() => {
      expect(mockExecuteReset).toHaveBeenCalledWith('newpassword1')
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
