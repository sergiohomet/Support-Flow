import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginForm } from '../LoginForm'

const defaultProps = {
  onSubmit: vi.fn(),
  isLoading: false,
  error: null,
}

function renderForm(props?: Partial<typeof defaultProps>) {
  return render(
    <MemoryRouter>
      <LoginForm {...defaultProps} {...props} />
    </MemoryRouter>,
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    defaultProps.onSubmit.mockReset()
  })

  it('shows error banner when error prop is set', () => {
    renderForm({ error: 'Email o contraseña incorrectos.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
  })

  it('disables submit button when isLoading=true', () => {
    renderForm({ isLoading: true })
    expect(screen.getByRole('button', { name: 'Ingresando...' })).toBeDisabled()
  })

  it('does NOT call onSubmit if email is invalid', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    const input = document.querySelector('input[name="password"]') as HTMLInputElement
    await user.type(input, 'somepassword')

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByText('Ingresá un email válido.')).toBeInTheDocument()
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('does NOT call onSubmit if email is empty', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByText('El email es requerido.')).toBeInTheDocument()
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct shape on valid submission', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    const input = document.querySelector('input[name="password"]') as HTMLInputElement
    await user.type(input, 'mypassword')

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(defaultProps.onSubmit).toHaveBeenCalledOnce()
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'mypassword',
    })
  })
})
