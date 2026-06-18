import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordInput } from '../PasswordInput'

const defaultProps = {
  id: 'password',
  name: 'password',
  value: '',
  onChange: vi.fn(),
}

describe('PasswordInput', () => {
  it('renders as password type by default', () => {
    render(<PasswordInput {...defaultProps} />)
    const input = document.querySelector('input[name="password"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.type).toBe('password')
  })

  it('toggle button changes type to text and back to password', async () => {
    const user = userEvent.setup()
    render(<PasswordInput {...defaultProps} />)

    const input = document.querySelector('input[name="password"]') as HTMLInputElement
    expect(input.type).toBe('password')

    const toggleBtn = screen.getByRole('button', { name: 'Mostrar contraseña' })
    await user.click(toggleBtn)
    expect(input.type).toBe('text')

    const hideBtn = screen.getByRole('button', { name: 'Ocultar contraseña' })
    await user.click(hideBtn)
    expect(input.type).toBe('password')
  })

  it('shows error text when error prop is provided', () => {
    render(<PasswordInput {...defaultProps} error="Campo requerido" />)
    expect(screen.getByText('Campo requerido')).toBeInTheDocument()
  })

  it('sets aria-invalid when error prop is provided', () => {
    render(<PasswordInput {...defaultProps} error="Campo requerido" />)
    const input = document.querySelector('input[name="password"]') as HTMLInputElement
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not set aria-invalid when no error', () => {
    render(<PasswordInput {...defaultProps} />)
    const input = document.querySelector('input[name="password"]') as HTMLInputElement
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })
})
