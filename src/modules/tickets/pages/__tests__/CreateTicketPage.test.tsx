import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CreateTicketPage } from '../CreateTicketPage'

// --- hook mocks ---

const mockExecute = vi.fn()
const mockLoadCategories = vi.fn()
const mockLoadAgents = vi.fn()

vi.mock('@/modules/tickets/hooks/useCreateTicket', () => ({
  useCreateTicket: vi.fn(),
}))

vi.mock('@/modules/tickets/hooks/useTicketList', () => ({
  useTicketList: vi.fn(),
}))

// --- store mock ---

type MockState = {
  categories: unknown[]
}

let mockState: MockState = {
  categories: [],
}

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: MockState) => unknown) => selector(mockState)),
}))

// --- imports after mocks ---

import { useCreateTicket } from '@/modules/tickets/hooks/useCreateTicket'
import { useTicketList } from '@/modules/tickets/hooks/useTicketList'

type CreateTicketHookReturn = ReturnType<typeof useCreateTicket>
type TicketListHookReturn = ReturnType<typeof useTicketList>

function makeCreateTicketReturn(overrides: Partial<CreateTicketHookReturn> = {}): CreateTicketHookReturn {
  return {
    execute: mockExecute,
    isLoading: false,
    error: null,
    ...overrides,
  }
}

function makeTicketListReturn(overrides: Partial<TicketListHookReturn> = {}): TicketListHookReturn {
  return {
    isFetching: false,
    isLoadingCategories: false,
    isLoadingAgents: false,
    error: null,
    fetch: vi.fn(),
    loadCategories: mockLoadCategories,
    loadAgents: mockLoadAgents,
    ...overrides,
  }
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <CreateTicketPage />
    </MemoryRouter>
  )
}

describe('CreateTicketPage', () => {
  beforeEach(() => {
    mockExecute.mockReset()
    mockLoadCategories.mockReset()
    mockLoadAgents.mockReset()

    mockLoadCategories.mockResolvedValue(undefined)
    mockExecute.mockResolvedValue(null)

    mockState = { categories: [] }

    vi.mocked(useCreateTicket).mockReturnValue(makeCreateTicketReturn())
    vi.mocked(useTicketList).mockReturnValue(makeTicketListReturn())
  })

  it('renders the page heading "Nuevo ticket"', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /nuevo ticket/i })).toBeInTheDocument()
  })

  it('renders the create ticket form fields', () => {
    renderPage()
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/prioridad/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /crear ticket/i })).toBeInTheDocument()
  })

  it('disables fields and shows "Creando..." when isLoading is true', () => {
    vi.mocked(useCreateTicket).mockReturnValue(makeCreateTicketReturn({ isLoading: true }))
    renderPage()
    expect(screen.getByRole('button', { name: /creando/i })).toBeDisabled()
    expect(screen.getByLabelText(/título/i)).toBeDisabled()
    expect(screen.getByLabelText(/descripción/i)).toBeDisabled()
  })

  it('shows error alert when error is set', () => {
    vi.mocked(useCreateTicket).mockReturnValue(
      makeCreateTicketReturn({ error: 'Error al crear el ticket. Intentá de nuevo.' })
    )
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Error al crear el ticket. Intentá de nuevo.')
  })

  it('renders "← Volver" back button', () => {
    renderPage()
    expect(screen.getByText(/← Volver/)).toBeInTheDocument()
  })

  it('calls loadCategories() on mount', () => {
    renderPage()
    expect(mockLoadCategories).toHaveBeenCalledTimes(1)
  })

  it('renders category options when categories are in store', () => {
    mockState.categories = [
      { id: 'cat-1', name: 'Soporte técnico', description: null },
      { id: 'cat-2', name: 'Facturación', description: null },
    ]
    renderPage()
    expect(screen.getByRole('option', { name: 'Soporte técnico' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Facturación' })).toBeInTheDocument()
  })
})
