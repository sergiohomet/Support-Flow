import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserFilters } from '../UserFilters'

const mockOnSearchChange = vi.fn()
const mockOnFilterChange = vi.fn()
const mockOnReset = vi.fn()

type CombinedFilter = '' | 'all' | 'admin' | 'agent' | 'client' | 'inactive'

function renderFilters(overrides: {
  search?: string
  combinedFilter?: CombinedFilter
  isLoading?: boolean
  hasActiveFilters?: boolean
} = {}) {
  return render(
    <UserFilters
      search={overrides.search ?? ''}
      combinedFilter={overrides.combinedFilter ?? 'all'}
      isLoading={overrides.isLoading ?? false}
      hasActiveFilters={overrides.hasActiveFilters ?? false}
      onSearchChange={mockOnSearchChange}
      onFilterChange={mockOnFilterChange}
      onReset={mockOnReset}
    />,
  )
}

describe('UserFilters', () => {
  beforeEach(() => {
    mockOnSearchChange.mockReset()
    mockOnFilterChange.mockReset()
    mockOnReset.mockReset()
  })

  describe('search input', () => {
    it('calls onSearchChange with raw string value when input changes', async () => {
      const user = userEvent.setup()
      renderFilters()

      const input = screen.getByRole('searchbox')
      await user.type(input, 'j')

      expect(mockOnSearchChange).toHaveBeenCalledOnce()
      expect(mockOnSearchChange).toHaveBeenCalledWith('j')
    })

    it('shows placeholder "Buscar por nombre, email o rol..."', () => {
      renderFilters()
      expect(screen.getByPlaceholderText('Buscar por nombre, email o rol...')).toBeInTheDocument()
    })
  })

  describe('combined filter dropdown', () => {
    it('renders a single filter dropdown with label "Filtros:"', () => {
      renderFilters()
      expect(screen.getByText('Filtros:')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('contains all expected filter options', () => {
      renderFilters()
      const select = screen.getByRole('combobox')
      const options = Array.from((select as HTMLSelectElement).options).map((o) => o.text)
      expect(options).toContain('Todos los usuarios')
      expect(options).toContain('Administradores')
      expect(options).toContain('Agentes')
      expect(options).toContain('Clientes')
      expect(options).toContain('Inactivos')
    })

    it('calls onFilterChange with "admin" when Administradores is selected', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(screen.getByRole('combobox'), 'admin')

      expect(mockOnFilterChange).toHaveBeenCalledOnce()
      expect(mockOnFilterChange).toHaveBeenCalledWith('admin')
    })

    it('calls onFilterChange with "agent" when Agentes is selected', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(screen.getByRole('combobox'), 'agent')

      expect(mockOnFilterChange).toHaveBeenCalledWith('agent')
    })

    it('calls onFilterChange with "client" when Clientes is selected', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(screen.getByRole('combobox'), 'client')

      expect(mockOnFilterChange).toHaveBeenCalledWith('client')
    })

    it('calls onFilterChange with "inactive" when Inactivos is selected', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(screen.getByRole('combobox'), 'inactive')

      expect(mockOnFilterChange).toHaveBeenCalledWith('inactive')
    })

    it('renders placeholder option "Seleccionar tipo" as the first option', () => {
      renderFilters({ combinedFilter: '' })
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.options[0].text).toBe('Seleccionar tipo')
      expect(select.options[0].disabled).toBe(true)
    })

    it('calls onFilterChange with "all" when Todos los usuarios is selected', async () => {
      const user = userEvent.setup()
      renderFilters({ combinedFilter: 'admin' })

      await user.selectOptions(screen.getByRole('combobox'), 'all')

      expect(mockOnFilterChange).toHaveBeenCalledWith('all')
    })
  })

  describe('reset button', () => {
    it('is not rendered when hasActiveFilters is false', () => {
      renderFilters({ hasActiveFilters: false })
      expect(screen.queryByRole('button', { name: /restablecer/i })).not.toBeInTheDocument()
    })

    it('is rendered when hasActiveFilters is true', () => {
      renderFilters({ hasActiveFilters: true })
      expect(screen.getByRole('button', { name: /restablecer/i })).toBeInTheDocument()
    })

    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup()
      renderFilters({ hasActiveFilters: true })

      await user.click(screen.getByRole('button', { name: /restablecer/i }))

      expect(mockOnReset).toHaveBeenCalledOnce()
    })
  })

  describe('loading state', () => {
    it('disables search input when isLoading is true', () => {
      renderFilters({ isLoading: true })
      expect(screen.getByRole('searchbox')).toBeDisabled()
    })

    it('disables filter select when isLoading is true', () => {
      renderFilters({ isLoading: true })
      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('disables reset button when isLoading is true and hasActiveFilters is true', () => {
      renderFilters({ isLoading: true, hasActiveFilters: true })
      expect(screen.getByRole('button', { name: /restablecer/i })).toBeDisabled()
    })
  })
})
