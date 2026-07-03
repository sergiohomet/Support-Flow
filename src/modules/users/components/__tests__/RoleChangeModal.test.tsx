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

const fakeCategories = [
  { id: 'cat-1', name: 'Hardware', description: null },
  { id: 'cat-2', name: 'Software', description: null },
]

const defaultProps = {
  isOpen: true,
  user: mockUser,
  categories: fakeCategories,
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
    const selects = screen.getAllByRole('combobox')
    expect((selects[0] as HTMLSelectElement).value).toBe('agent')
  })

  it('onConfirm called with selected role and undefined categoryId when switching to admin', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderModal({ onConfirm })

    const [roleSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(roleSelect, 'admin')

    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(onConfirm).toHaveBeenCalledWith('admin', undefined)
  })

  it('requires a category when role is agent — confirm disabled until one is picked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderModal({ onConfirm })

    const confirmBtn = screen.getByRole('button', { name: /confirmar/i })
    expect(confirmBtn).toBeDisabled()

    const categorySelect = screen.getByLabelText('Especialidad')
    await user.selectOptions(categorySelect, 'Hardware')

    expect(confirmBtn).not.toBeDisabled()
    await user.click(confirmBtn)

    expect(onConfirm).toHaveBeenCalledWith('agent', 'cat-1')
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
