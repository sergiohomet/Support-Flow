import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleGuard } from '../RoleGuard'

// --- store mock ---

type MockState = {
  user: { id: string; email: string; full_name: string; role: 'client' | 'agent' | 'admin' } | null
  isAuthReady: boolean
}

let mockState: MockState = {
  user: null,
  isAuthReady: true,
}

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: MockState) => unknown) => selector(mockState)),
}))

// --- helpers ---

function renderGuard(allowedRoles: string[], redirectTo?: string): void {
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <RoleGuard allowedRoles={allowedRoles} redirectTo={redirectTo}>
              <div>Contenido protegido</div>
            </RoleGuard>
          }
        />
        <Route path="/login" element={<div>Página de login</div>} />
        <Route path="/unauthorized" element={<div>Sin acceso</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RoleGuard', () => {
  beforeEach(() => {
    mockState = {
      user: null,
      isAuthReady: true,
    }
  })

  describe('when isAuthReady is false', () => {
    it('renders nothing (null) while auth is initializing', () => {
      mockState = { user: null, isAuthReady: false }
      const { container } = render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RoleGuard allowedRoles={['client']}>
                  <div>Contenido protegido</div>
                </RoleGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when user is not authenticated', () => {
    it('redirects to /login when user is null', () => {
      mockState = { user: null, isAuthReady: true }
      renderGuard(['client'])
      expect(screen.getByText('Página de login')).toBeInTheDocument()
      expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    })
  })

  describe('when user role is allowed', () => {
    it('renders children for client role with allowedRoles=["client"]', () => {
      mockState = {
        user: { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' },
        isAuthReady: true,
      }
      renderGuard(['client'])
      expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    })

    it('renders children for agent role with allowedRoles=["agent", "admin"]', () => {
      mockState = {
        user: { id: 'u2', email: 'agent@test.com', full_name: 'Agent User', role: 'agent' },
        isAuthReady: true,
      }
      renderGuard(['agent', 'admin'])
      expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    })

    it('renders children for admin role with allowedRoles=["client", "agent", "admin"]', () => {
      mockState = {
        user: { id: 'u3', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
        isAuthReady: true,
      }
      renderGuard(['client', 'agent', 'admin'])
      expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
    })
  })

  describe('when user role is NOT allowed', () => {
    it('redirects agent to /unauthorized when allowedRoles=["client"]', () => {
      mockState = {
        user: { id: 'u2', email: 'agent@test.com', full_name: 'Agent User', role: 'agent' },
        isAuthReady: true,
      }
      renderGuard(['client'], '/unauthorized')
      expect(screen.getByText('Sin acceso')).toBeInTheDocument()
      expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    })

    it('redirects admin to /unauthorized when allowedRoles=["client"]', () => {
      mockState = {
        user: { id: 'u3', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
        isAuthReady: true,
      }
      renderGuard(['client'], '/unauthorized')
      expect(screen.getByText('Sin acceso')).toBeInTheDocument()
      expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    })

    it('redirects client to /unauthorized when allowedRoles=["agent", "admin"]', () => {
      mockState = {
        user: { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' },
        isAuthReady: true,
      }
      renderGuard(['agent', 'admin'], '/unauthorized')
      expect(screen.getByText('Sin acceso')).toBeInTheDocument()
      expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
    })

    it('uses custom redirectTo prop instead of default /unauthorized', () => {
      mockState = {
        user: { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' },
        isAuthReady: true,
      }
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RoleGuard allowedRoles={['admin']} redirectTo="/login">
                  <div>Contenido protegido</div>
                </RoleGuard>
              }
            />
            <Route path="/login" element={<div>Página de login</div>} />
          </Routes>
        </MemoryRouter>
      )
      expect(screen.getByText('Página de login')).toBeInTheDocument()
    })
  })

  describe('/tickets/new route guard (allowedRoles=["client"])', () => {
    it('client can access /tickets/new', () => {
      mockState = {
        user: { id: 'u1', email: 'client@test.com', full_name: 'Client User', role: 'client' },
        isAuthReady: true,
      }
      render(
        <MemoryRouter initialEntries={['/tickets/new']}>
          <Routes>
            <Route
              path="/tickets/new"
              element={
                <RoleGuard allowedRoles={['client']}>
                  <div>Formulario de nuevo ticket</div>
                </RoleGuard>
              }
            />
            <Route path="/unauthorized" element={<div>Sin acceso</div>} />
          </Routes>
        </MemoryRouter>
      )
      expect(screen.getByText('Formulario de nuevo ticket')).toBeInTheDocument()
    })

    it('agent is blocked from /tickets/new and redirected to /unauthorized', () => {
      mockState = {
        user: { id: 'u2', email: 'agent@test.com', full_name: 'Agent User', role: 'agent' },
        isAuthReady: true,
      }
      render(
        <MemoryRouter initialEntries={['/tickets/new']}>
          <Routes>
            <Route
              path="/tickets/new"
              element={
                <RoleGuard allowedRoles={['client']} redirectTo="/unauthorized">
                  <div>Formulario de nuevo ticket</div>
                </RoleGuard>
              }
            />
            <Route path="/login" element={<div>Página de login</div>} />
            <Route path="/unauthorized" element={<div>Sin acceso</div>} />
          </Routes>
        </MemoryRouter>
      )
      expect(screen.getByText('Sin acceso')).toBeInTheDocument()
      expect(screen.queryByText('Formulario de nuevo ticket')).not.toBeInTheDocument()
    })

    it('admin is blocked from /tickets/new and redirected to /unauthorized', () => {
      mockState = {
        user: { id: 'u3', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
        isAuthReady: true,
      }
      render(
        <MemoryRouter initialEntries={['/tickets/new']}>
          <Routes>
            <Route
              path="/tickets/new"
              element={
                <RoleGuard allowedRoles={['client']} redirectTo="/unauthorized">
                  <div>Formulario de nuevo ticket</div>
                </RoleGuard>
              }
            />
            <Route path="/login" element={<div>Página de login</div>} />
            <Route path="/unauthorized" element={<div>Sin acceso</div>} />
          </Routes>
        </MemoryRouter>
      )
      expect(screen.getByText('Sin acceso')).toBeInTheDocument()
      expect(screen.queryByText('Formulario de nuevo ticket')).not.toBeInTheDocument()
    })
  })
})
