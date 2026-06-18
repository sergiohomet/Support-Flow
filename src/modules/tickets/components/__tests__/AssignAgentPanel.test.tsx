import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Agent } from '@/modules/tickets/schemas'
import { AssignAgentPanel } from '../AssignAgentPanel'

const mockOnAssign = vi.fn()

const AGENTS: Agent[] = [
  { id: 'agent-1', fullName: 'María López', specialty: null, activeTicketCount: 2 },
  { id: 'agent-2', fullName: 'Juan Pérez', specialty: null, activeTicketCount: 1 },
  { id: 'agent-3', fullName: 'Ana Gómez', specialty: null, activeTicketCount: 4 },
]

function renderPanel(
  overrides: {
    agents?: Agent[]
    currentAgentId?: string | null
    isLoading?: boolean
    error?: string | null
  } = {},
) {
  return render(
    <AssignAgentPanel
      agents={overrides.agents ?? AGENTS}
      currentAgentId={overrides.currentAgentId ?? null}
      onAssign={mockOnAssign}
      isLoading={overrides.isLoading ?? false}
      error={overrides.error ?? null}
    />,
  )
}

describe('AssignAgentPanel', () => {
  beforeEach(() => {
    mockOnAssign.mockReset()
  })

  describe('rendering', () => {
    it('renders the agent select', () => {
      renderPanel()

      expect(screen.getByRole('combobox', { name: 'Seleccionar agente' })).toBeInTheDocument()
    })

    it('renders agent options from prop', () => {
      renderPanel()

      expect(screen.getByRole('option', { name: /María López/ })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Juan Pérez/ })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Ana Gómez/ })).toBeInTheDocument()
    })

    it('renders the assign button', () => {
      renderPanel()

      expect(screen.getByRole('button', { name: 'Asignar' })).toBeInTheDocument()
    })

    it('pre-selects the currentAgentId in the select', () => {
      renderPanel({ currentAgentId: 'agent-2' })

      const select = screen.getByRole('combobox', { name: 'Seleccionar agente' })
      expect(select).toHaveValue('agent-2')
    })
  })

  describe('submit behavior', () => {
    it('calls onAssign with the selected agentId when a different agent is chosen', async () => {
      const user = userEvent.setup()
      renderPanel()

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Seleccionar agente' }),
        'agent-1',
      )
      await user.click(screen.getByRole('button', { name: 'Asignar' }))

      expect(mockOnAssign).toHaveBeenCalledOnce()
      expect(mockOnAssign).toHaveBeenCalledWith('agent-1')
    })

    it('does not call onAssign when no agent is selected', async () => {
      const user = userEvent.setup()
      renderPanel()

      // default select value is empty — button should be disabled
      await user.click(screen.getByRole('button', { name: 'Asignar' }))

      expect(mockOnAssign).not.toHaveBeenCalled()
    })

    it('button is disabled when no agent is selected', () => {
      renderPanel()

      expect(screen.getByRole('button', { name: 'Asignar' })).toBeDisabled()
    })

    it('does not call onAssign when the selected agent is the same as currentAgentId', async () => {
      const user = userEvent.setup()
      // currentAgentId is agent-1, and that is already pre-selected
      renderPanel({ currentAgentId: 'agent-1' })

      await user.click(screen.getByRole('button', { name: 'Asignar' }))

      expect(mockOnAssign).not.toHaveBeenCalled()
    })

    it('button is disabled when selected agent equals currentAgentId', () => {
      renderPanel({ currentAgentId: 'agent-2' })

      expect(screen.getByRole('button', { name: 'Asignar' })).toBeDisabled()
    })

    it('button becomes enabled when a different agent is selected', async () => {
      const user = userEvent.setup()
      renderPanel({ currentAgentId: 'agent-1' })

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Seleccionar agente' }),
        'agent-2',
      )

      expect(screen.getByRole('button', { name: 'Asignar' })).toBeEnabled()
    })
  })

  describe('loading state', () => {
    it('shows "Asignando..." text on the button when isLoading is true', () => {
      renderPanel({ isLoading: true })

      expect(screen.getByRole('button', { name: 'Asignando...' })).toBeInTheDocument()
    })

    it('disables the button when isLoading is true', () => {
      renderPanel({ isLoading: true })

      expect(screen.getByRole('button', { name: 'Asignando...' })).toBeDisabled()
    })

    it('disables the select when isLoading is true', () => {
      renderPanel({ isLoading: true })

      expect(screen.getByRole('combobox', { name: 'Seleccionar agente' })).toBeDisabled()
    })
  })

  describe('error state', () => {
    it('renders error prop in an alert when provided', () => {
      renderPanel({ error: 'No se pudo asignar el agente' })

      expect(screen.getByRole('alert')).toHaveTextContent('No se pudo asignar el agente')
    })

    it('does not render error alert when error is null', () => {
      renderPanel({ error: null })

      // only the warning alert could appear — ensure no alert at all with no warning triggered
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('high ticket count warning', () => {
    it('shows warning alert when selected agent has 4 or more active tickets', async () => {
      const user = userEvent.setup()
      renderPanel()

      // agent-3 has activeTicketCount: 4 — meets the threshold
      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Seleccionar agente' }),
        'agent-3',
      )

      expect(screen.getByRole('alert')).toHaveTextContent('4 tickets activos')
    })

    it('does not show warning when selected agent has fewer than 4 active tickets', async () => {
      const user = userEvent.setup()
      renderPanel()

      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Seleccionar agente' }),
        'agent-1',
      )

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
