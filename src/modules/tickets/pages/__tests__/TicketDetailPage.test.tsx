import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { TicketDetailPage } from '../TicketDetailPage'

// --- react-router-dom mock (useParams) ---

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useParams: () => ({ id: 'ticket-uuid-123' }) }
})

// --- hook mocks ---

const mockFetchDetail = vi.fn()
const mockAssignTicket = vi.fn()
const mockUpdateStatus = vi.fn()
const mockAddComment = vi.fn()
const mockLoadAgents = vi.fn()

vi.mock('@/modules/tickets/hooks/useTicketDetail', () => ({
  useTicketDetail: vi.fn(),
}))

vi.mock('@/modules/tickets/hooks/useUnassignTicket', () => ({
  useUnassignTicket: vi.fn(),
}))

vi.mock('@/modules/tickets/hooks/useUpdateTicketStatus', () => ({
  useUpdateTicketStatus: vi.fn(),
}))

vi.mock('@/modules/tickets/hooks/useAddComment', () => ({
  useAddComment: vi.fn(),
}))

vi.mock('@/modules/tickets/hooks/useAgentList', () => ({
  useAgentList: vi.fn(),
}))

// --- store mock ---

type MockState = {
  user: { id: string; email: string; full_name: string; role: 'client' | 'agent' | 'admin' } | null
  agents: unknown[]
}

let mockState: MockState = {
  user: { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' },
  agents: [],
}

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: MockState) => unknown) => selector(mockState)),
}))

// --- imports after mocks ---

import { useTicketDetail } from '@/modules/tickets/hooks/useTicketDetail'
import { useUnassignTicket } from '@/modules/tickets/hooks/useUnassignTicket'
import { useUpdateTicketStatus } from '@/modules/tickets/hooks/useUpdateTicketStatus'
import { useAddComment } from '@/modules/tickets/hooks/useAddComment'
import { useAgentList } from '@/modules/tickets/hooks/useAgentList'
import type { TicketDetail, StatusLogEntry } from '@/modules/tickets/schemas'

const fakeTicket: TicketDetail = {
  id: 'ticket-uuid-123',
  title: 'Mi ticket de prueba',
  description: 'Descripción del ticket de prueba',
  status: 'abierto',
  priority: 'media',
  categoryId: 'cat-1',
  categoryName: 'Soporte técnico',
  categoryIsActive: true,
  clientId: 'user-1',
  clientFullName: 'Juan Pérez',
  agentId: null,
  agentFullName: null,
  aiTriage: null,
  createdAt: '2026-06-15T10:00:00Z',
  updatedAt: '2026-06-15T10:00:00Z',
  escalatedAt: null,
  slaHours: 24,
}

const fakeTicketWithAgent: TicketDetail = {
  ...fakeTicket,
  agentId: 'agent-42',
  agentFullName: 'Laura García',
  status: 'en_proceso',
}

const fakeStatusLog: StatusLogEntry[] = [
  {
    id: 's-1',
    ticketId: 'ticket-uuid-123',
    fromStatus: 'abierto',
    toStatus: 'en_proceso',
    changedBy: 'agent-42',
    changedByFullName: 'Laura García',
    changedAt: '2026-06-15T10:30:00Z',
  },
]

function makeDetailReturn(overrides: Partial<ReturnType<typeof useTicketDetail>> = {}): ReturnType<typeof useTicketDetail> {
  return {
    ticket: null,
    comments: [],
    statusLog: [],
    isLoading: false,
    error: null,
    refetch: mockFetchDetail,
    ...overrides,
  }
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/tickets/ticket-uuid-123']}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TicketDetailPage', () => {
  beforeEach(() => {
    mockFetchDetail.mockReset()
    mockAssignTicket.mockReset()
    mockUpdateStatus.mockReset()
    mockAddComment.mockReset()
    mockLoadAgents.mockReset()

    mockFetchDetail.mockResolvedValue(undefined)
    mockAssignTicket.mockResolvedValue(true)
    mockUpdateStatus.mockResolvedValue(true)
    mockAddComment.mockResolvedValue(null)
    mockLoadAgents.mockResolvedValue(undefined)

    mockState = {
      user: { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' },
      agents: [],
    }

    vi.mocked(useTicketDetail).mockClear()
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn())
    vi.mocked(useUnassignTicket).mockReturnValue({ execute: mockAssignTicket, isLoading: false, error: null })
    vi.mocked(useUpdateTicketStatus).mockReturnValue({ execute: mockUpdateStatus, isLoading: false, error: null })
    vi.mocked(useAddComment).mockReturnValue({ execute: mockAddComment, isLoading: false, error: null })
    vi.mocked(useAgentList).mockReturnValue({
      isLoadingAgents: false,
      error: null,
      loadAgents: mockLoadAgents,
    })
  })

  it('shows spinner while isLoading is true and ticket is null', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ isLoading: true, ticket: null }))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('does NOT show spinner when ticket is already loaded (background refetch)', () => {
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ isLoading: true, ticket: fakeTicket })
    )
    renderPage()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Mi ticket de prueba')).toBeInTheDocument()
  })

  it('shows error message when error is set and ticket is null', () => {
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ error: 'Ticket not found or access denied.', ticket: null })
    )
    renderPage()
    expect(screen.getByText('Ticket not found or access denied.')).toBeInTheDocument()
  })

  it('renders ticket title when ticket data is available', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.getByRole('heading', { name: 'Mi ticket de prueba' })).toBeInTheDocument()
  })

  it('renders ticket status badge', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.getByText(/abierto/i)).toBeInTheDocument()
  })

  it('renders ticket priority badge', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.getByText(/media/i)).toBeInTheDocument()
  })

  it('renders category name', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.getByText('Soporte técnico')).toBeInTheDocument()
  })

  it('renders client name', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    // Juan Pérez appears in both header and sidebar details
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThanOrEqual(1)
  })

  it('calls useTicketDetail with the ticket id from the route', () => {
    renderPage()
    expect(vi.mocked(useTicketDetail)).toHaveBeenCalledWith('ticket-uuid-123')
  })

  it('calls loadAgents() on mount', () => {
    renderPage()
    expect(mockLoadAgents).toHaveBeenCalledTimes(1)
  })

  it('does NOT render AssignAgentPanel for client role', () => {
    mockState.user = { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' }
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.queryByLabelText(/seleccionar agente/i)).not.toBeInTheDocument()
  })

  it('renders nothing ticket-specific when ticket is null and not loading and no error', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: null, isLoading: false, error: null }))
    renderPage()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  // --- P08 new tests ---

  it('shows ticket description in the main column', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.getByText('Descripción del ticket de prueba')).toBeInTheDocument()
  })

  it('shows SLA not-configured state when the category has no SLA hours', () => {
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: { ...fakeTicket, slaHours: null } })
    )
    renderPage()
    expect(screen.getByText('No configurado')).toBeInTheDocument()
  })

  it('shows overdue state for an open ticket past its SLA deadline, not yet escalated', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.getByText('Vencido — pendiente de escalar')).toBeInTheDocument()
  })

  it('shows escalated state with the escalation date when the ticket was escalated', () => {
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: { ...fakeTicket, escalatedAt: '2026-06-16T08:00:00Z' } })
    )
    renderPage()
    expect(screen.getByText('SLA incumplido')).toBeInTheDocument()
    expect(screen.getByText(/Escalado el/)).toBeInTheDocument()
  })

  it('shows resolved-in-SLA state for a resolved, non-escalated ticket', () => {
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: { ...fakeTicket, status: 'resuelto', escalatedAt: null } })
    )
    renderPage()
    expect(screen.getByText('Resuelto dentro del SLA')).toBeInTheDocument()
  })

  it('shows a live countdown for an open ticket still within its SLA window', () => {
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({
        ticket: { ...fakeTicket, createdAt: new Date().toISOString(), slaHours: 24 },
      })
    )
    renderPage()
    expect(screen.getByText(/Vence en/)).toBeInTheDocument()
  })

  it('shows "Sin acciones disponibles." for client with open ticket', () => {
    mockState.user = { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' }
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.getByText('Sin acciones disponibles.')).toBeInTheDocument()
  })

  it('shows "Reabrir Ticket" button for client when ticket is resuelto', () => {
    mockState.user = { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' }
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: { ...fakeTicket, status: 'resuelto' } })
    )
    renderPage()
    expect(screen.getByRole('button', { name: /reabrir ticket/i })).toBeInTheDocument()
  })

  it('shows "Resolver Ticket" button for agent when ticket is en_proceso', () => {
    mockState.user = { id: 'agent-42', email: 'agent@test.com', full_name: 'Laura García', role: 'agent' }
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: fakeTicketWithAgent })
    )
    renderPage()
    expect(screen.getByRole('button', { name: /resolver ticket/i })).toBeInTheDocument()
  })

  it('shows "Devolver al pool" button for agent when ticket has an assigned agent', () => {
    mockState.user = { id: 'agent-42', email: 'agent@test.com', full_name: 'Laura García', role: 'agent' }
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: fakeTicketWithAgent })
    )
    renderPage()
    expect(screen.getByRole('button', { name: 'Devolver al pool' })).toBeInTheDocument()
  })

  it('does NOT show "Devolver al pool" when no agent is assigned', () => {
    mockState.user = { id: 'agent-42', email: 'agent@test.com', full_name: 'Laura García', role: 'agent' }
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: { ...fakeTicket, status: 'abierto', agentId: null } })
    )
    renderPage()
    expect(screen.queryByRole('button', { name: 'Devolver al pool' })).not.toBeInTheDocument()
  })

  it('renders status log entries inside the feed (activity section)', () => {
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: fakeTicket, statusLog: fakeStatusLog })
    )
    renderPage()
    // "cambió el estado" appears in both the feed and the TicketStatusLog sidebar section
    expect(screen.getAllByText(/cambió el estado/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Registro de Estado" section in the sidebar', () => {
    vi.mocked(useTicketDetail).mockReturnValue(makeDetailReturn({ ticket: fakeTicket }))
    renderPage()
    expect(screen.getByText('Registro de Estado')).toBeInTheDocument()
  })

  // --- Reopen gate tests (TASK-22) ---

  it('blocks reopen when category is inactive — does NOT show reopen button', () => {
    mockState.user = { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' }
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: { ...fakeTicket, status: 'resuelto', categoryIsActive: false } })
    )
    renderPage()
    expect(screen.queryByRole('button', { name: /reabrir ticket/i })).not.toBeInTheDocument()
  })

  it('blocks reopen when category is inactive — shows disabled category message', () => {
    mockState.user = { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' }
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: { ...fakeTicket, status: 'resuelto', categoryIsActive: false } })
    )
    renderPage()
    expect(
      screen.getByText('Esta categoría fue deshabilitada. Creá un nuevo ticket con una categoría activa.')
    ).toBeInTheDocument()
  })

  it('allows reopen when category is active — shows reopen button', () => {
    mockState.user = { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' }
    vi.mocked(useTicketDetail).mockReturnValue(
      makeDetailReturn({ ticket: { ...fakeTicket, status: 'resuelto', categoryIsActive: true } })
    )
    renderPage()
    expect(screen.getByRole('button', { name: /reabrir ticket/i })).toBeInTheDocument()
  })
})
