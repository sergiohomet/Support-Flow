import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CreateUserInput } from '@/modules/users/schemas'
import { CreateUserModal } from '../CreateUserModal'

// jsdom does not implement HTMLDialogElement methods
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
})

const defaultProps = {
  isOpen: true,
  isLoading: false,
  error: null,
  onSubmit: vi.fn(),
  onClose: vi.fn(),
}

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  return render(<CreateUserModal {...defaultProps} {...overrides} />)
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Jane Doe')
  await user.type(screen.getByLabelText('Email'), 'jane@example.com')
  await user.type(screen.getByLabelText('Temporary password'), 'secret123')
}

describe('CreateUserModal', () => {
  it('does not call onSubmit when fullName is empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Temporary password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not call onSubmit when email is invalid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.type(screen.getByLabelText('Full name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Temporary password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not call onSubmit when password is less than 8 chars', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.type(screen.getByLabelText('Full name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Temporary password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct CreateUserInput when all fields are valid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    const expected: CreateUserInput = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      temporaryPassword: 'secret123',
      role: 'agent',
      specialty: null,
    }
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith(expected)
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('displays error message when error prop is set', () => {
    renderModal({ error: 'User creation failed' })

    expect(screen.getByRole('alert')).toHaveTextContent('User creation failed')
  })

  it('specialty field is visible and accepts input', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    expect(screen.getByLabelText('Specialty')).toBeInTheDocument()

    await fillValidForm(user)
    await user.type(screen.getByLabelText('Specialty'), 'Billing')
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ specialty: 'Billing' }),
    )
  })

  it('disables submit button when isLoading is true', () => {
    renderModal({ isLoading: true })

    expect(screen.getByRole('button', { name: 'Create user' })).toBeDisabled()
  })
})
