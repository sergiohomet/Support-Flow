import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TicketStatus } from '@/modules/tickets/schemas'
import type { UserRole } from '@/store/authSlice'
import { StatusUpdatePanel } from '../StatusUpdatePanel'

const mockOnUpdate = vi.fn()

function renderPanel(
  currentStatus: TicketStatus,
  userRole: UserRole,
  overrides: { isLoading?: boolean; error?: string | null } = {},
) {
  return render(
    <StatusUpdatePanel
      currentStatus={currentStatus}
      userRole={userRole}
      onUpdate={mockOnUpdate}
      isLoading={overrides.isLoading ?? false}
      error={overrides.error ?? null}
    />,
  )
}

describe('StatusUpdatePanel', () => {
  beforeEach(() => {
    mockOnUpdate.mockReset()
  })

  describe('agent transitions', () => {
    it('shows "Marcar en proceso" and "Marcar resuelto" when status is abierto', () => {
      renderPanel('abierto', 'agent')

      expect(screen.getByRole('button', { name: 'Marcar en proceso' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Marcar resuelto' })).toBeInTheDocument()
    })

    it('shows "Marcar resuelto" and "Marcar abierto" when status is en_proceso', () => {
      renderPanel('en_proceso', 'agent')

      expect(screen.getByRole('button', { name: 'Marcar resuelto' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Marcar abierto' })).toBeInTheDocument()
    })

    it('shows "Reabrir ticket" when status is resuelto', () => {
      renderPanel('resuelto', 'agent')

      expect(screen.getByRole('button', { name: 'Reabrir ticket' })).toBeInTheDocument()
    })

    it('calls onUpdate with the correct status when button is clicked', async () => {
      const user = userEvent.setup()
      renderPanel('abierto', 'agent')

      await user.click(screen.getByRole('button', { name: 'Marcar en proceso' }))

      expect(mockOnUpdate).toHaveBeenCalledOnce()
      expect(mockOnUpdate).toHaveBeenCalledWith('en_proceso')
    })

    it('calls onUpdate with resuelto when that button is clicked from abierto', async () => {
      const user = userEvent.setup()
      renderPanel('abierto', 'agent')

      await user.click(screen.getByRole('button', { name: 'Marcar resuelto' }))

      expect(mockOnUpdate).toHaveBeenCalledWith('resuelto')
    })
  })

  describe('client transitions', () => {
    it('shows no transitions when status is abierto and role is client', () => {
      renderPanel('abierto', 'client')

      expect(screen.getByText('No hay transiciones disponibles.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /marcar|reabrir/i })).not.toBeInTheDocument()
    })

    it('shows "Reabrir ticket" when status is resuelto and role is client', () => {
      renderPanel('resuelto', 'client')

      expect(screen.getByRole('button', { name: 'Reabrir ticket' })).toBeInTheDocument()
    })

    it('calls onUpdate with reabierto when client clicks reabrir', async () => {
      const user = userEvent.setup()
      renderPanel('resuelto', 'client')

      await user.click(screen.getByRole('button', { name: 'Reabrir ticket' }))

      expect(mockOnUpdate).toHaveBeenCalledOnce()
      expect(mockOnUpdate).toHaveBeenCalledWith('reabierto')
    })
  })

  describe('admin transitions', () => {
    it('shows agent-level transitions for admin role', () => {
      renderPanel('abierto', 'admin')

      expect(screen.getByRole('button', { name: 'Marcar en proceso' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Marcar resuelto' })).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('disables all transition buttons when isLoading is true', () => {
      renderPanel('abierto', 'agent', { isLoading: true })

      const buttons = screen.getAllByRole('button')
      buttons.forEach((btn) => expect(btn).toBeDisabled())
    })

    it('does not call onUpdate when button is disabled', async () => {
      const user = userEvent.setup()
      renderPanel('abierto', 'agent', { isLoading: true })

      await user.click(screen.getByRole('button', { name: 'Marcar en proceso' }))

      expect(mockOnUpdate).not.toHaveBeenCalled()
    })
  })

  describe('error state', () => {
    it('renders error prop in an alert when provided', () => {
      renderPanel('abierto', 'agent', { error: 'No se pudo actualizar el estado' })

      expect(screen.getByRole('alert')).toHaveTextContent('No se pudo actualizar el estado')
    })

    it('does not render alert when error is null', () => {
      renderPanel('abierto', 'agent', { error: null })

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
