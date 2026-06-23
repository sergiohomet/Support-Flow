import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleChangeModal } from '../RoleChangeModal'

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

const mockUser = {
  fullName: 'Alice Smith',
  role: 'agent',
}

const defaultProps = {
  isOpen: true,
  user: mockUser,
  isLoading: false,
  error: null,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

function renderModal(props: Partial<typeof defaultProps> = {}): void {
  render(<RoleChangeModal {...defaultProps} {...props} />)
}

describe('RoleChangeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with user name in description', () => {
    renderModal()
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
  })

  it('select pre-set to current role', () => {
    renderModal()
    const select = screen.getByRole('combobox')
    expect((select as HTMLSelectElement).value).toBe('agent')
  })

  it('onConfirm called with selected role on confirm click', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderModal({ onConfirm })

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'admin')

    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(onConfirm).toHaveBeenCalledWith('admin')
  })

  it('onClose called on cancel', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it('confirm button disabled when isLoading', () => {
    renderModal({ isLoading: true })
    const confirmBtn = screen.getByRole('button', { name: /confirmar/i })
    expect(confirmBtn).toBeDisabled()
  })

  it('error message shown when error prop is set', () => {
    renderModal({ error: 'Something went wrong' })
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
