import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryFormModal } from '../CategoryFormModal'

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

const defaultProps = {
  isOpen: true,
  isLoading: false,
  error: null,
  onSubmit: vi.fn(),
  onClose: vi.fn(),
}

function renderModal(overrides: Partial<typeof defaultProps & { initialData?: { id: string; name: string; description: string | null } }> = {}) {
  return render(<CategoryFormModal {...defaultProps} {...overrides} />)
}

describe('CategoryFormModal', () => {
  it('renders "Nueva categoría" title when no initialData', () => {
    renderModal()

    expect(screen.getByText(/nueva categoría/i)).toBeInTheDocument()
  })

  it('renders "Editar categoría" title when initialData is provided', () => {
    renderModal({ initialData: { id: 'cat-1', name: 'Soporte', description: null } })

    expect(screen.getByText(/editar categoría/i)).toBeInTheDocument()
  })

  it('pre-fills name and description when initialData provided', () => {
    renderModal({
      initialData: { id: 'cat-1', name: 'Soporte', description: 'Soporte técnico' },
    })

    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Soporte')
    expect(screen.getByLabelText(/descripción/i)).toHaveValue('Soporte técnico')
  })

  it('does not call onSubmit when name is empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument()
  })

  it('does not call onSubmit when name exceeds 50 chars', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.type(screen.getByLabelText(/nombre/i), 'A'.repeat(51))
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Máximo 50 caracteres')).toBeInTheDocument()
  })

  it('calls onSubmit with correct data on valid submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    await user.type(screen.getByLabelText(/nombre/i), 'Facturación')
    await user.type(screen.getByLabelText(/descripción/i), 'Problemas de facturación')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith('Facturación', 'Problemas de facturación')
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows error alert when error prop is non-null', () => {
    renderModal({ error: 'Ya existe una categoría con ese nombre.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe una categoría con ese nombre.')
  })

  it('disables submit button when isLoading=true', () => {
    renderModal({ isLoading: true })

    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled()
  })
})
