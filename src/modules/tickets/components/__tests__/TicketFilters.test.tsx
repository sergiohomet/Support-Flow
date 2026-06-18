import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Category, Agent } from '@/modules/tickets/schemas'
import type { TicketFilters } from '@/store/ticketsSlice'
import { TicketFilters as TicketFiltersComponent } from '../TicketFilters'

const mockOnChange = vi.fn()
const mockOnReset = vi.fn()

const CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Facturación', description: null },
  { id: 'cat-2', name: 'Soporte técnico', description: null },
]

const AGENTS: Agent[] = [
  { id: 'agent-1', fullName: 'María López', specialty: null, activeTicketCount: 2 },
  { id: 'agent-2', fullName: 'Juan Pérez', specialty: null, activeTicketCount: 1 },
]

const EMPTY_FILTERS: TicketFilters = {
  status: null,
  priority: null,
  categoryId: null,
  agentId: null,
  page: 1,
  pageSize: 20,
}

function renderFilters(
  overrides: {
    filters?: Partial<TicketFilters>
    categories?: Category[]
    agents?: Agent[]
    isLoading?: boolean
  } = {},
) {
  return render(
    <TicketFiltersComponent
      filters={{ ...EMPTY_FILTERS, ...overrides.filters }}
      categories={overrides.categories ?? CATEGORIES}
      agents={overrides.agents ?? []}
      onChange={mockOnChange}
      onReset={mockOnReset}
      isLoading={overrides.isLoading ?? false}
    />,
  )
}

describe('TicketFilters', () => {
  beforeEach(() => {
    mockOnChange.mockReset()
    mockOnReset.mockReset()
  })

  describe('rendering', () => {
    it('renders status, priority and category selects', () => {
      renderFilters()

      expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Filtrar por prioridad' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Filtrar por categoría' })).toBeInTheDocument()
    })

    it('does not render agent select when agents array is empty', () => {
      renderFilters({ agents: [] })

      expect(
        screen.queryByRole('combobox', { name: 'Filtrar por agente' }),
      ).not.toBeInTheDocument()
    })

    it('renders agent select when agents are provided', () => {
      renderFilters({ agents: AGENTS })

      expect(screen.getByRole('combobox', { name: 'Filtrar por agente' })).toBeInTheDocument()
    })

    it('renders category options from prop', () => {
      renderFilters()

      expect(screen.getByRole('option', { name: 'Facturación' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Soporte técnico' })).toBeInTheDocument()
    })

    it('renders agent options from prop', () => {
      renderFilters({ agents: AGENTS })

      expect(screen.getByRole('option', { name: /María López/ })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Juan Pérez/ })).toBeInTheDocument()
    })

    it('does not render reset button when no filters are active', () => {
      renderFilters()

      expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
    })

    it('renders reset button when a filter is active', () => {
      renderFilters({ filters: { status: 'abierto' } })

      expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
    })
  })

  describe('onChange callbacks', () => {
    it('calls onChange with status value when status select changes', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Filtrar por estado' }),
        'abierto',
      )

      expect(mockOnChange).toHaveBeenCalledOnce()
      expect(mockOnChange).toHaveBeenCalledWith({ status: 'abierto' })
    })

    it('calls onChange with null status when empty option is selected', async () => {
      const user = userEvent.setup()
      renderFilters({ filters: { status: 'abierto' } })

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Filtrar por estado' }),
        '',
      )

      expect(mockOnChange).toHaveBeenCalledWith({ status: null })
    })

    it('calls onChange with priority value when priority select changes', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Filtrar por prioridad' }),
        'alta',
      )

      expect(mockOnChange).toHaveBeenCalledOnce()
      expect(mockOnChange).toHaveBeenCalledWith({ priority: 'alta' })
    })

    it('calls onChange with categoryId when category select changes', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Filtrar por categoría' }),
        'cat-1',
      )

      expect(mockOnChange).toHaveBeenCalledOnce()
      expect(mockOnChange).toHaveBeenCalledWith({ categoryId: 'cat-1' })
    })

    it('calls onChange with agentId when agent select changes', async () => {
      const user = userEvent.setup()
      renderFilters({ agents: AGENTS })

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Filtrar por agente' }),
        'agent-2',
      )

      expect(mockOnChange).toHaveBeenCalledOnce()
      expect(mockOnChange).toHaveBeenCalledWith({ agentId: 'agent-2' })
    })
  })

  describe('reset', () => {
    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup()
      renderFilters({ filters: { status: 'resuelto' } })

      await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

      expect(mockOnReset).toHaveBeenCalledOnce()
    })
  })

  describe('loading state', () => {
    it('disables all selects when isLoading is true', () => {
      renderFilters({ isLoading: true })

      const selects = screen.getAllByRole('combobox')
      selects.forEach((sel) => expect(sel).toBeDisabled())
    })

    it('disables reset button when isLoading is true', () => {
      renderFilters({ filters: { status: 'abierto' }, isLoading: true })

      expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeDisabled()
    })
  })
})
