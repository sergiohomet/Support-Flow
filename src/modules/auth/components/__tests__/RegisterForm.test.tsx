import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RegisterForm } from '../RegisterForm'

const defaultProps = {
  onSubmit: vi.fn(),
  isLoading: false,
  error: null,
  success: false,
}

function renderForm(props?: Partial<typeof defaultProps>) {
  return render(
    <MemoryRouter>
      <RegisterForm {...defaultProps} {...props} />
    </MemoryRouter>,
  )
}

describe('RegisterForm', () => {
  beforeEach(() => {
    defaultProps.onSubmit.mockReset()
  })

  it('shows success message when success=true and hides form', () => {
    renderForm({ success: true })
    expect(screen.getByRole('status')).toHaveTextContent('Revisá tu email para confirmar tu cuenta.')
    expect(screen.queryByRole('button', { name: /registr/i })).not.toBeInTheDocument()
  })

  it('shows error banner when error prop is set', () => {
    renderForm({ error: 'Ocurrió un error inesperado.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
  })

  it('disables submit button when isLoading=true', () => {
    renderForm({ isLoading: true })
    expect(screen.getByRole('button', { name: 'Registrando...' })).toBeDisabled()
  })

  it('does NOT call onSubmit if confirm_password does not match password', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Nombre completo'), 'Juan Pérez')
    await user.type(screen.getByLabelText('Email'), 'juan@example.com')

    // type into both PasswordInput fields via their underlying inputs
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    await user.type(passwordInputs[0], 'password123')
    await user.type(passwordInputs[1], 'differentpass')

    await user.click(screen.getByRole('button', { name: 'Registrarse' }))

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('does NOT call onSubmit if email is invalid', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Nombre completo'), 'Juan Pérez')
    await user.type(screen.getByLabelText('Email'), 'not-an-email')

    const passwordInputs = document.querySelectorAll('input[type="password"]')
    await user.type(passwordInputs[0], 'password123')
    await user.type(passwordInputs[1], 'password123')

    await user.click(screen.getByRole('button', { name: 'Registrarse' }))

    expect(screen.getByText('Ingresá un email válido.')).toBeInTheDocument()
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('does NOT call onSubmit if validation fails (empty fields)', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Registrarse' }))

    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct data on valid submission', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Nombre completo'), 'Juan Pérez')
    await user.type(screen.getByLabelText('Email'), 'juan@example.com')

    const passwordInputs = document.querySelectorAll('input[type="password"]')
    await user.type(passwordInputs[0], 'password123')
    await user.type(passwordInputs[1], 'password123')

    await user.click(screen.getByRole('button', { name: 'Registrarse' }))

    expect(defaultProps.onSubmit).toHaveBeenCalledOnce()
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      full_name: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'password123',
      confirm_password: 'password123',
    })
  })
})
