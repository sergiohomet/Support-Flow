import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AgentDashboardPage } from '../AgentDashboardPage'
import { useMyAssignedTickets } from '../../hooks/useMyAssignedTickets'
import { useAgentMetrics } from '../../hooks/useAgentMetrics'
import type { AgentDashboardTicket } from '../../schemas'

vi.mock('../../hooks/useAgentMetrics', () => ({
  useAgentMetrics: vi.fn(),
}))
vi.mock('../../hooks/useMyAssignedTickets', () => ({
  useMyAssignedTickets: vi.fn(),
}))
vi.mock('@/core/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}))

type MockUser = { id: string; category_id: string | null; category_name: string | null } | null

let mockUser: MockUser = { id: 'agent-1', category_id: 'cat-1', category_name: 'Accesos' }

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: { user: MockUser }) => unknown) => selector({ user: mockUser })),
}))

const mockRefetchAssigned = vi.fn()
const mockResolve = vi.fn()
const mockReturnToPool = vi.fn()

function makeMetricsReturn(
  overrides: Partial<ReturnType<typeof useAgentMetrics>> = {}
): ReturnType<typeof useAgentMetrics> {
  return {
    data: {
      assignedCount: 3,
      resolvedThisMonth: 12,
      slaCompliancePct: 85.5,
      avgResolutionHours: 4.2,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
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
    mockResolve.mockReset().mockResolvedValue(true)
    mockReturnToPool.mockReset().mockResolvedValue(true)
    mockRefetchAssigned.mockReset()
    mockUser = { id: 'agent-1', category_id: 'cat-1', category_name: 'Accesos' }

    vi.mocked(useAgentMetrics).mockReturnValue(makeMetricsReturn())
    vi.mocked(useMyAssignedTickets).mockReturnValue(makeAssignedReturn())
  })

  it('calls useAgentMetrics with the user agentId', () => {
    renderPage()
    expect(vi.mocked(useAgentMetrics)).toHaveBeenCalledWith('agent-1')
  })

  it('calls useMyAssignedTickets with the user agentId', () => {
    renderPage()
    expect(vi.mocked(useMyAssignedTickets)).toHaveBeenCalledWith('agent-1')
  })

  it('renders metric cards with correct labels', () => {
    renderPage()
    expect(screen.getAllByText('Asignados').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Resueltos (mes)')).toBeInTheDocument()
    expect(screen.getByText('SLA cumplido')).toBeInTheDocument()
    expect(screen.getByText('Tiempo prom. resolución')).toBeInTheDocument()
  })

  it('renders metric values from the hook', () => {
    renderPage()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('86')).toBeInTheDocument()
    expect(screen.getByText('4.2')).toBeInTheDocument()
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

  it('shows an inline error banner when the metrics hook errors', () => {
    vi.mocked(useAgentMetrics).mockReturnValue(
      makeMetricsReturn({ error: 'Error al procesar la solicitud. Intentá de nuevo.' })
    )
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('shows an inline error banner when the assigned tickets hook errors', () => {
    vi.mocked(useMyAssignedTickets).mockReturnValue(
      makeAssignedReturn({ error: 'Error de conexión' })
    )
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Error de conexión')
  })
})
