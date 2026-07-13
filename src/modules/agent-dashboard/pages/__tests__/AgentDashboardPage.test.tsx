import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AgentDashboardPage } from '../AgentDashboardPage'
import { useAvailableTickets } from '../../hooks/useAvailableTickets'
import { useMyAssignedTickets } from '../../hooks/useMyAssignedTickets'
import type { AgentDashboardTicket } from '../../schemas'

vi.mock('../../hooks/useAvailableTickets', () => ({
  useAvailableTickets: vi.fn(),
}))
vi.mock('../../hooks/useMyAssignedTickets', () => ({
  useMyAssignedTickets: vi.fn(),
}))

type MockUser = { id: string; category_id: string | null; category_name: string | null } | null

let mockUser: MockUser = { id: 'agent-1', category_id: 'cat-1', category_name: 'Accesos' }

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: { user: MockUser }) => unknown) => selector({ user: mockUser })),
}))

const mockClaim = vi.fn()
const mockRefetchAvailable = vi.fn()
const mockResolve = vi.fn()
const mockReturnToPool = vi.fn()
const mockRefetchAssigned = vi.fn()

function makeAvailableReturn(
  overrides: Partial<ReturnType<typeof useAvailableTickets>> = {}
): ReturnType<typeof useAvailableTickets> {
  return {
    tickets: [],
    isLoading: false,
    error: null,
    refetch: mockRefetchAvailable,
    claim: mockClaim,
    claimError: null,
    ...overrides,
  }
}

function makeAssignedReturn(
  overrides: Partial<ReturnType<typeof useMyAssignedTickets>> = {}
): ReturnType<typeof useMyAssignedTickets> {
  return {
    tickets: [],
    isLoading: false,
    error: null,
    refetch: mockRefetchAssigned,
    resolve: mockResolve,
    returnToPool: mockReturnToPool,
    ...overrides,
  }
}

const AVAILABLE_TICKET: AgentDashboardTicket = {
  id: 'avail-uuid-1',
  title: 'No puedo acceder a mi cuenta',
  description: 'El usuario no puede iniciar sesión desde ayer a la tarde.',
  status: 'abierto',
  priority: 'alta',
  categoryId: 'cat-1',
  categoryName: 'Accesos',
  agentId: null,
  agentFullName: null,
  createdAt: '2026-07-12T00:00:00Z',
  updatedAt: '2026-07-12T00:00:00Z',
  escalatedAt: null,
  slaHours: null,
  commentCount: 0,
}

const ASSIGNED_TICKET: AgentDashboardTicket = {
  id: 'assigned-uuid-1',
  title: 'Factura duplicada',
  description: 'El cliente reporta un cobro duplicado en su última factura.',
  status: 'en_proceso',
  priority: 'media',
  categoryId: 'cat-1',
  categoryName: 'Accesos',
  agentId: 'agent-1',
  agentFullName: 'Ana García',
  createdAt: '2026-07-12T00:00:00Z',
  updatedAt: '2026-07-12T00:00:00Z',
  escalatedAt: null,
  slaHours: 24,
  commentCount: 1,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AgentDashboardPage />
    </MemoryRouter>
  )
}

describe('AgentDashboardPage', () => {
  beforeEach(() => {
    mockClaim.mockReset().mockResolvedValue(true)
    mockRefetchAvailable.mockReset()
    mockResolve.mockReset().mockResolvedValue(true)
    mockReturnToPool.mockReset().mockResolvedValue(true)
    mockRefetchAssigned.mockReset()
    mockUser = { id: 'agent-1', category_id: 'cat-1', category_name: 'Accesos' }

    vi.mocked(useAvailableTickets).mockReturnValue(makeAvailableReturn())
    vi.mocked(useMyAssignedTickets).mockReturnValue(makeAssignedReturn())
  })

  it('calls useAvailableTickets with the user categoryId and agentId', () => {
    renderPage()
    expect(vi.mocked(useAvailableTickets)).toHaveBeenCalledWith('cat-1', 'agent-1')
  })

  it('calls useMyAssignedTickets with the user agentId', () => {
    renderPage()
    expect(vi.mocked(useMyAssignedTickets)).toHaveBeenCalledWith('agent-1')
  })

  it('shows a "no category assigned" empty state when the agent has no category', () => {
    mockUser = { id: 'agent-1', category_id: null, category_name: null }
    renderPage()
    expect(screen.getByText(/no tenés una categoría asignada/i)).toBeInTheDocument()
  })

  it('shows a "no tickets" empty state when the category has no available tickets', () => {
    renderPage()
    expect(screen.getByText(/no hay tickets disponibles/i)).toBeInTheDocument()
  })

  it('renders one AvailableTicketCard per available ticket', () => {
    vi.mocked(useAvailableTickets).mockReturnValue(
      makeAvailableReturn({ tickets: [AVAILABLE_TICKET] })
    )
    renderPage()
    expect(screen.getByText('No puedo acceder a mi cuenta')).toBeInTheDocument()
  })

  it('shows a "no assigned tickets" empty state when the agent has none assigned', () => {
    renderPage()
    expect(screen.getByText(/no tenés tickets asignados/i)).toBeInTheDocument()
  })

  it('renders one AssignedTicketCard per assigned ticket', () => {
    vi.mocked(useMyAssignedTickets).mockReturnValue(
      makeAssignedReturn({ tickets: [ASSIGNED_TICKET] })
    )
    renderPage()
    expect(screen.getByText('Factura duplicada')).toBeInTheDocument()
  })

  it('renders the CapacityBar with current = assigned ticket count and max = 5', () => {
    vi.mocked(useMyAssignedTickets).mockReturnValue(
      makeAssignedReturn({ tickets: [ASSIGNED_TICKET] })
    )
    renderPage()
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('calls claim() when a "Tomar Ticket" button is clicked', async () => {
    vi.mocked(useAvailableTickets).mockReturnValue(
      makeAvailableReturn({ tickets: [AVAILABLE_TICKET] })
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /^tomar ticket$/i }))
    expect(mockClaim).toHaveBeenCalledWith('avail-uuid-1')
  })

  it('calls resolve() when the Resolver button is clicked', async () => {
    vi.mocked(useMyAssignedTickets).mockReturnValue(
      makeAssignedReturn({ tickets: [ASSIGNED_TICKET] })
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /^resolver$/i }))
    expect(mockResolve).toHaveBeenCalledWith('assigned-uuid-1')
  })

  it('calls returnToPool() when the Devolver al pool button is clicked', async () => {
    vi.mocked(useMyAssignedTickets).mockReturnValue(
      makeAssignedReturn({ tickets: [ASSIGNED_TICKET] })
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /^devolver al pool$/i }))
    expect(mockReturnToPool).toHaveBeenCalledWith('assigned-uuid-1')
  })

  it('refetches the assigned list after a successful claim (cross-panel staleness fix)', async () => {
    vi.mocked(useAvailableTickets).mockReturnValue(
      makeAvailableReturn({ tickets: [AVAILABLE_TICKET] })
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /^tomar ticket$/i }))
    expect(mockClaim).toHaveBeenCalledWith('avail-uuid-1')
    expect(mockRefetchAssigned).toHaveBeenCalledTimes(1)
  })

  it('does NOT refetch the assigned list when claim fails', async () => {
    mockClaim.mockResolvedValue(false)
    vi.mocked(useAvailableTickets).mockReturnValue(
      makeAvailableReturn({ tickets: [AVAILABLE_TICKET] })
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /^tomar ticket$/i }))
    expect(mockRefetchAssigned).not.toHaveBeenCalled()
  })

  it('refetches the available list after a successful returnToPool (cross-panel staleness fix)', async () => {
    vi.mocked(useMyAssignedTickets).mockReturnValue(
      makeAssignedReturn({ tickets: [ASSIGNED_TICKET] })
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /^devolver al pool$/i }))
    expect(mockReturnToPool).toHaveBeenCalledWith('assigned-uuid-1')
    expect(mockRefetchAvailable).toHaveBeenCalledTimes(1)
  })

  it('does NOT refetch the available list when returnToPool fails', async () => {
    mockReturnToPool.mockResolvedValue(false)
    vi.mocked(useMyAssignedTickets).mockReturnValue(
      makeAssignedReturn({ tickets: [ASSIGNED_TICKET] })
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /^devolver al pool$/i }))
    expect(mockRefetchAvailable).not.toHaveBeenCalled()
  })

  it('passes disabled=true to available cards (warning, not hard-disable) when the agent is near capacity (4 assigned)', () => {
    const fourTickets = Array.from({ length: 4 }, (_, i) => ({
      ...ASSIGNED_TICKET,
      id: `assigned-${i}`,
    }))
    vi.mocked(useAvailableTickets).mockReturnValue(
      makeAvailableReturn({ tickets: [AVAILABLE_TICKET] })
    )
    vi.mocked(useMyAssignedTickets).mockReturnValue(makeAssignedReturn({ tickets: fourTickets }))
    renderPage()
    expect(screen.getByText(/cerca del límite de capacidad/i)).toBeInTheDocument()
    // per resolved design decision: warn, don't hard-disable
    expect(screen.getByRole('button', { name: /^tomar ticket$/i })).not.toBeDisabled()
  })

  it('still shows the capacity warning when the agent is fully AT capacity (5 assigned)', () => {
    const fiveTickets = Array.from({ length: 5 }, (_, i) => ({
      ...ASSIGNED_TICKET,
      id: `assigned-${i}`,
    }))
    vi.mocked(useAvailableTickets).mockReturnValue(
      makeAvailableReturn({ tickets: [AVAILABLE_TICKET] })
    )
    vi.mocked(useMyAssignedTickets).mockReturnValue(makeAssignedReturn({ tickets: fiveTickets }))
    renderPage()
    expect(screen.getByText(/cerca del límite de capacidad/i)).toBeInTheDocument()
  })

  it('shows an inline error banner when the available tickets hook errors', () => {
    vi.mocked(useAvailableTickets).mockReturnValue(
      makeAvailableReturn({ error: 'Error al procesar la solicitud. Intentá de nuevo.' })
    )
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('does not block the page with a full-page spinner while isLoading is true', () => {
    vi.mocked(useAvailableTickets).mockReturnValue(
      makeAvailableReturn({ tickets: [AVAILABLE_TICKET], isLoading: true })
    )
    renderPage()
    // The already-loaded ticket stays visible while a background refetch runs.
    expect(screen.getByText('No puedo acceder a mi cuenta')).toBeInTheDocument()
  })
})
