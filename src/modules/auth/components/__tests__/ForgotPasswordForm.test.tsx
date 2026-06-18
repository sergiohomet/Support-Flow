import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from '../ForgotPasswordForm'

const defaultRequestProps = {
  phase: 'request' as const,
  onSubmitRequest: vi.fn(),
  onSubmitReset: vi.fn(),
  isLoading: false,
  error: null,
  sent: false,
}

const defaultResetProps = {
  phase: 'reset' as const,
  onSubmitRequest: vi.fn(),
  onSubmitReset: vi.fn(),
  isLoading: false,
  error: null,
  sent: false,
}

describe('ForgotPasswordForm — request phase', () => {
  beforeEach(() => {
    defaultRequestProps.onSubmitRequest.mockReset()
    defaultRequestProps.onSubmitReset.mockReset()
  })

  it('shows email input in request phase', () => {
    render(<ForgotPasswordForm {...defaultRequestProps} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeInTheDocument()
  })

  it('shows neutral sent message when sent=true (no email disclosure)', () => {
    render(<ForgotPasswordForm {...defaultRequestProps} sent={true} />)
    expect(screen.getByRole('status')).toHaveTextContent('Te enviamos un enlace de recuperación al email.')
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('shows error banner when error prop is set', () => {
    render(<ForgotPasswordForm {...defaultRequestProps} error="Ocurrió un error." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error.')
  })

  it('calls onSubmitRequest with email on valid submit', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm {...defaultRequestProps} />)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(defaultRequestProps.onSubmitRequest).toHaveBeenCalledOnce()
    expect(defaultRequestProps.onSubmitRequest).toHaveBeenCalledWith('user@example.com')
  })

  it('does NOT call onSubmitRequest if email is empty', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm {...defaultRequestProps} />)

    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(defaultRequestProps.onSubmitRequest).not.toHaveBeenCalled()
    expect(screen.getByText('El email es requerido.')).toBeInTheDocument()
  })
})

describe('ForgotPasswordForm — reset phase', () => {
  beforeEach(() => {
    defaultResetProps.onSubmitRequest.mockReset()
    defaultResetProps.onSubmitReset.mockReset()
  })

  it('shows password fields in reset phase', () => {
    render(<ForgotPasswordForm {...defaultResetProps} />)
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar nueva contraseña' })).toBeInTheDocument()
  })

  it('shows error banner when error prop is set', () => {
    render(<ForgotPasswordForm {...defaultResetProps} error="Token expirado." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Token expirado.')
  })

  it('validates that confirm_password matches password', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm {...defaultResetProps} />)

    const passwordInputs = document.querySelectorAll('input[type="password"]')
    await user.type(passwordInputs[0], 'newpassword1')
    await user.type(passwordInputs[1], 'differentpass1')

    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(defaultResetProps.onSubmitReset).not.toHaveBeenCalled()
  })

  it('calls onSubmitReset with password on valid submit', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordForm {...defaultResetProps} />)

    const passwordInputs = document.querySelectorAll('input[type="password"]')
    await user.type(passwordInputs[0], 'newpassword1')
    await user.type(passwordInputs[1], 'newpassword1')

    await user.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))

    expect(defaultResetProps.onSubmitReset).toHaveBeenCalledOnce()
    expect(defaultResetProps.onSubmitReset).toHaveBeenCalledWith('newpassword1')
  })
})
