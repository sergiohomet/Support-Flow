import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Category } from '@/modules/categories/schemas'
import { ToggleCategoryModal } from '../ToggleCategoryModal'

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

const activeCategory: Category = {
  id: 'cat-1',
  name: 'Facturación',
  description: 'Problemas de facturación',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  maxResolutionHours: 24,
}

const inactiveCategory: Category = {
  ...activeCategory,
  isActive: false,
}

const defaultProps = {
  isOpen: true,
  isLoading: false,
  category: activeCategory,
  onConfirm: vi.fn(),
  onClose: vi.fn(),
}

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  return render(<ToggleCategoryModal {...defaultProps} {...overrides} />)
}

describe('ToggleCategoryModal', () => {
  it('shows deactivation title when category.isActive=true', () => {
    renderModal({ category: activeCategory })

    expect(screen.getByRole('heading')).toHaveTextContent(/desactivar/i)
  })

  it('shows category name in title', () => {
    renderModal({ category: activeCategory })

    expect(screen.getByRole('heading')).toHaveTextContent('Facturación')
  })

  it('shows deactivation warning text when category.isActive=true', () => {
    renderModal({ category: activeCategory })

    expect(screen.getByText(/tickets existentes/i)).toBeInTheDocument()
  })

  it('shows activation title when category.isActive=false', () => {
    renderModal({ category: inactiveCategory })

    expect(screen.getByRole('heading')).toHaveTextContent(/activar/i)
  })

  it('does NOT show warning text when category.isActive=false', () => {
    renderModal({ category: inactiveCategory })

    expect(screen.queryByText(/tickets existentes/i)).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderModal({ onConfirm })

    await user.click(screen.getByRole('button', { name: /desactivar/i }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    await user.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(defaultProps.onConfirm).not.toHaveBeenCalled()
  })

  it('disables confirm button when isLoading=true', () => {
    renderModal({ isLoading: true })

    expect(screen.getByRole('button', { name: /desactivar/i })).toBeDisabled()
  })
})
