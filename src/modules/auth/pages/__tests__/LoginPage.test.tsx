import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'

const mockExecute = vi.fn()
let mockError: string | null = null

vi.mock('@/modules/auth/hooks/useLogin', () => ({
  useLogin: () => ({
    execute: (...args: unknown[]) => mockExecute(...args),
    isLoading: false,
    get error() {
      return mockError
    },
  }),
}))

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockExecute.mockReset()
    mockExecute.mockResolvedValue(undefined)
    mockError = null
  })

  it('renders LoginForm with correct title', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument()
  })

  it('calls execute with correct shape on valid submit', async () => {
    renderPage()

    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(document.querySelector('input[type="password"]')!, {
      target: { value: 'mypassword' },
    })

    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'mypassword',
      })
    })
  })

  it('does not call execute when email is empty', async () => {
    renderPage()

    fireEvent.change(document.querySelector('input[type="password"]')!, {
      target: { value: 'mypassword' },
    })

    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByText(/email es requerido/i)).toBeInTheDocument()
    })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('passes error from hook to the form', () => {
    mockError = 'Email o contraseña incorrectos'
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Email o contraseña incorrectos')
  })
})
