import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal } from '../ConfirmModal'

// jsdom does not implement HTMLDialogElement methods
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
})

const defaultProps = {
  isOpen: false,
  title: 'Delete user',
  description: 'Are you sure you want to delete this user?',
  confirmLabel: 'Delete',
  isLoading: false,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  return render(<ConfirmModal {...defaultProps} {...overrides} />)
}

describe('ConfirmModal', () => {
  it('does not call showModal when isOpen is false', () => {
    renderModal({ isOpen: false })
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled()
  })

  it('calls showModal when isOpen is true', () => {
    renderModal({ isOpen: true })
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderModal({ isOpen: true, onConfirm })

    await user.click(screen.getByRole('button', { name: defaultProps.confirmLabel }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ isOpen: true, onClose })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('disables confirm button when isLoading is true', () => {
    renderModal({ isOpen: true, isLoading: true })

    expect(screen.getByRole('button', { name: defaultProps.confirmLabel })).toBeDisabled()
  })

  it('renders title and description', () => {
    renderModal({ isOpen: true })

    expect(screen.getByText(defaultProps.title)).toBeInTheDocument()
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument()
  })
})
