import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Category } from '@/modules/categories/schemas'
import { CategoryTable } from '../CategoryTable'

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Facturación',
  description: 'Problemas de facturación',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  maxResolutionHours: 24,
  ...overrides,
})

const defaultProps = {
  categories: [makeCategory()],
  isFetching: false,
  onEdit: vi.fn(),
  onToggle: vi.fn(),
}

function renderTable(overrides: Partial<typeof defaultProps> = {}) {
  return render(<CategoryTable {...defaultProps} {...overrides} />)
}

describe('CategoryTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a row per category with name, description, and SLA', () => {
    renderTable()

    expect(screen.getByText('Facturación')).toBeInTheDocument()
    expect(screen.getByText('Problemas de facturación')).toBeInTheDocument()
    expect(screen.getByText('24h')).toBeInTheDocument()
  })

  it('shows "—" when maxResolutionHours is null', () => {
    renderTable({
      categories: [makeCategory({ maxResolutionHours: null })],
    })

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows "Activa" badge when isActive=true', () => {
    renderTable({ categories: [makeCategory({ isActive: true })] })

    expect(screen.getByText('Activa')).toBeInTheDocument()
  })

  it('shows "Inactiva" badge when isActive=false', () => {
    renderTable({ categories: [makeCategory({ isActive: false })] })

    expect(screen.getByText('Inactiva')).toBeInTheDocument()
  })

  it('shows EmptyState when categories array is empty', () => {
    renderTable({ categories: [] })

    expect(screen.getByText('No hay categorías')).toBeInTheDocument()
  })

  it('shows Spinner when isFetching=true and categories is empty', () => {
    renderTable({ categories: [], isFetching: true })

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('calls onEdit with correct category when edit button clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const category = makeCategory()
    renderTable({ categories: [category], onEdit })

    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onEdit).toHaveBeenCalledWith(category)
  })

  it('calls onToggle with correct category when toggle button clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const category = makeCategory()
    renderTable({ categories: [category], onToggle })

    await user.click(screen.getByRole('button', { name: /desactivar|reactivar/i }))

    expect(onToggle).toHaveBeenCalledOnce()
    expect(onToggle).toHaveBeenCalledWith(category)
  })
})
