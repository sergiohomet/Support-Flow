import { render, screen, type RenderResult } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RootRedirect } from '../RootRedirect'

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

function renderRootRedirect(): RenderResult {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/tickets" element={<div>Lista de tickets</div>} />
        <Route path="/agent/dashboard" element={<div>Panel de agente</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RootRedirect', () => {
  beforeEach(() => {
    mockState = {
      user: null,
      isAuthReady: true,
    }
  })

  describe('when isAuthReady is false', () => {
    it('renders nothing (null) while auth is initializing', () => {
      mockState = { user: null, isAuthReady: false }
      const { container } = renderRootRedirect()
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when user role is agent', () => {
    it('redirects to /agent/dashboard', () => {
      mockState = {
        user: { id: 'u1', email: 'agent@test.com', full_name: 'Agent User', role: 'agent' },
        isAuthReady: true,
      }
      renderRootRedirect()
      expect(screen.getByText('Panel de agente')).toBeInTheDocument()
    })
  })

  describe('when user role is client', () => {
    it('redirects to /tickets', () => {
      mockState = {
        user: { id: 'u2', email: 'client@test.com', full_name: 'Client User', role: 'client' },
        isAuthReady: true,
      }
      renderRootRedirect()
      expect(screen.getByText('Lista de tickets')).toBeInTheDocument()
    })
  })

  describe('when user role is admin', () => {
    it('redirects to /tickets', () => {
      mockState = {
        user: { id: 'u3', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
        isAuthReady: true,
      }
      renderRootRedirect()
      expect(screen.getByText('Lista de tickets')).toBeInTheDocument()
    })
  })

  describe('when user is null', () => {
    it('falls back to /tickets as a safe default', () => {
      mockState = { user: null, isAuthReady: true }
      renderRootRedirect()
      expect(screen.getByText('Lista de tickets')).toBeInTheDocument()
    })
  })
})
