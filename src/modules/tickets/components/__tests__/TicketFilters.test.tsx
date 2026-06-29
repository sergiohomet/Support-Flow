import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TicketFilters } from '../TicketFilters'

const mockOnTabChange = vi.fn()
const mockOnSearchChange = vi.fn()
const mockOnReset = vi.fn()

function renderFilters(
  overrides: {
    statusTab?: Parameters<typeof TicketFilters>[0]['statusTab']
    search?: string
    isLoading?: boolean
    hasActiveFilters?: boolean
  } = {},
) {
  return render(
    <TicketFilters
      statusTab={overrides.statusTab ?? ''}
      search={overrides.search ?? ''}
      isLoading={overrides.isLoading ?? false}
      hasActiveFilters={overrides.hasActiveFilters ?? false}
      onTabChange={mockOnTabChange}
      onSearchChange={mockOnSearchChange}
      onReset={mockOnReset}
    />,
  )
}

describe('TicketFilters', () => {
  beforeEach(() => {
    mockOnTabChange.mockReset()
    mockOnSearchChange.mockReset()
    mockOnReset.mockReset()
  })

  describe('tabs', () => {
    it('renders all status tabs', () => {
      renderFilters()
      expect(screen.getByRole('tab', { name: 'Todos' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Abierto' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'En Proceso' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Resuelto' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Reabierto' })).toBeInTheDocument()
    })

    it('marks the active tab with aria-selected="true"', () => {
      renderFilters({ statusTab: 'abierto' })
      expect(screen.getByRole('tab', { name: 'Abierto' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'false')
    })

    it('calls onTabChange with the correct value when a tab is clicked', async () => {
      const user = userEvent.setup()
      renderFilters()
      await user.click(screen.getByRole('tab', { name: 'En Proceso' }))
      expect(mockOnTabChange).toHaveBeenCalledOnce()
      expect(mockOnTabChange).toHaveBeenCalledWith('en_proceso')
    })

    it('calls onTabChange with empty string when "Todos" tab is clicked', async () => {
      const user = userEvent.setup()
      renderFilters({ statusTab: 'abierto' })
      await user.click(screen.getByRole('tab', { name: 'Todos' }))
      expect(mockOnTabChange).toHaveBeenCalledWith('')
    })

    it('disables all tabs when isLoading is true', () => {
      renderFilters({ isLoading: true })
      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab) => expect(tab).toBeDisabled())
    })
  })

  describe('search input', () => {
    it('renders search input', () => {
      renderFilters()
      expect(screen.getByRole('searchbox', { name: 'Buscar ticket' })).toBeInTheDocument()
    })

    it('reflects the current search value', () => {
      renderFilters({ search: 'factura' })
      expect(screen.getByRole('searchbox', { name: 'Buscar ticket' })).toHaveValue('factura')
    })

    it('calls onSearchChange when input value changes', async () => {
      const user = userEvent.setup()
      renderFilters()
      await user.type(screen.getByRole('searchbox', { name: 'Buscar ticket' }), 'problema')
      expect(mockOnSearchChange).toHaveBeenCalled()
    })

    it('disables search input when isLoading is true', () => {
      renderFilters({ isLoading: true })
      expect(screen.getByRole('searchbox', { name: 'Buscar ticket' })).toBeDisabled()
    })
  })

  describe('reset button', () => {
    it('does not render reset button when hasActiveFilters is false', () => {
      renderFilters({ hasActiveFilters: false })
      expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
    })

    it('renders reset button when hasActiveFilters is true', () => {
      renderFilters({ hasActiveFilters: true })
      expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
    })

    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup()
      renderFilters({ hasActiveFilters: true })
      await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
      expect(mockOnReset).toHaveBeenCalledOnce()
    })

    it('disables reset button when isLoading is true', () => {
      renderFilters({ hasActiveFilters: true, isLoading: true })
      expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeDisabled()
    })
  })
})
