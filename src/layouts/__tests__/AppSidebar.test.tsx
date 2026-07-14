import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppSidebar } from '../AppSidebar'
import type { UserRole } from '@/store/authSlice'

type MockUser = { id: string; full_name: string; role: UserRole } | null

let mockUser: MockUser = { id: 'u1', full_name: 'Agent User', role: 'agent' }

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: { user: MockUser }) => unknown) => selector({ user: mockUser })),
}))

vi.mock('@/core/supabase/client', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}))

function renderSidebar(role: UserRole) {
  mockUser = { id: 'u1', full_name: 'Test User', role }
  return render(
    <MemoryRouter>
      <AppSidebar />
    </MemoryRouter>,
  )
}

describe('AppSidebar', () => {
  it('does not show "Reportes" for an agent', () => {
    renderSidebar('agent')
    expect(screen.queryByText('Reportes')).not.toBeInTheDocument()
  })

  it('shows the agent-specific Dashboard link and the common items for an agent', () => {
    renderSidebar('agent')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Mis Tickets')).toBeInTheDocument()
    expect(screen.getByText('Notificaciones')).toBeInTheDocument()
  })

  it('does not show any admin-only links (Categorías, SLA, Usuarios) for an agent', () => {
    renderSidebar('agent')
    expect(screen.queryByText('Categorías')).not.toBeInTheDocument()
    expect(screen.queryByText('Configuración SLA')).not.toBeInTheDocument()
    expect(screen.queryByText('Dashboard SLA')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
  })

  it('shows "Reportes" for an admin', () => {
    renderSidebar('admin')
    expect(screen.getByText('Reportes')).toBeInTheDocument()
  })

  it('does not show "Reportes" or "Dashboard" for a client', () => {
    renderSidebar('client')
    expect(screen.queryByText('Reportes')).not.toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.getByText('Crear Ticket')).toBeInTheDocument()
  })
})
