import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CreateUserInput } from '@/modules/users/schemas'
import { CreateUserModal } from '../CreateUserModal'

// jsdom does not implement HTMLDialogElement methods.
// Simulate open/close by toggling the `open` attribute so the
// accessibility tree is exposed (role="dialog" + child roles).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
})

beforeEach(() => {
  vi.clearAllMocks()
})

const fakeCategories = [
  { id: 'cat-1', name: 'Hardware', description: null },
  { id: 'cat-2', name: 'Software', description: null },
  { id: 'cat-3', name: 'Redes', description: null },
]

const defaultProps = {
  isOpen: true,
  isLoading: false,
  error: null,
  categories: fakeCategories,
  onSubmit: vi.fn(),
  onClose: vi.fn(),
}

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  return render(<CreateUserModal {...defaultProps} {...overrides} />)
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre completo'), 'Jane Doe')
  await user.type(screen.getByLabelText('Email'), 'jane@example.com')
  await user.type(screen.getByLabelText('Contraseña temporal'), 'secret123')
}

describe('CreateUserModal', () => {
  it('does not call onSubmit when fullName is empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Contraseña temporal'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not call onSubmit when email is invalid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.type(screen.getByLabelText('Nombre completo'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Contraseña temporal'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not call onSubmit when password is less than 8 chars', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.type(screen.getByLabelText('Nombre completo'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Contraseña temporal'), 'short')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct CreateUserInput when all fields are valid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await fillValidForm(user)
    await user.selectOptions(screen.getByLabelText('Especialidad'), 'Hardware')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    const expected: CreateUserInput = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      temporaryPassword: 'secret123',
      role: 'agent',
      categoryId: 'cat-1',
    }
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith(expected)
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('displays error message when error prop is set', () => {
    renderModal({ error: 'User creation failed' })

    expect(screen.getByRole('alert')).toHaveTextContent('User creation failed')
  })

  it('specialty field is a dropdown populated from categories', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    const specialtySelect = screen.getByLabelText('Especialidad')
    expect(specialtySelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Hardware' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Software' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Redes' })).toBeInTheDocument()

    await fillValidForm(user)
    await user.selectOptions(specialtySelect, 'Hardware')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-1' }),
    )
  })

  it('does not submit when role is agent and no category was selected (categoryId required)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('La especialidad es obligatoria para agentes')).toBeInTheDocument()
  })

  it('hides the specialty field when role is admin (specialty only applies to agents)', async () => {
    const user = userEvent.setup()
    renderModal()

    expect(screen.getByLabelText('Especialidad')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Rol'), 'admin')

    expect(screen.queryByLabelText('Especialidad')).not.toBeInTheDocument()
  })

  it('submits categoryId: null when role is admin, even if a category was picked before switching', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await fillValidForm(user)
    await user.selectOptions(screen.getByLabelText('Especialidad'), 'Hardware')
    await user.selectOptions(screen.getByLabelText('Rol'), 'admin')
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin', categoryId: null }),
    )
  })

  it('disables submit button when isLoading is true', () => {
    renderModal({ isLoading: true })

    expect(screen.getByRole('button', { name: 'Crear usuario' })).toBeDisabled()
  })
})
