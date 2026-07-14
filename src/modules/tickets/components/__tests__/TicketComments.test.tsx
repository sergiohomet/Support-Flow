import { render, screen } from '@testing-library/react'
import type { TicketComment, StatusLogEntry, TicketStatus } from '@/modules/tickets/schemas'
import { TicketComments } from '../TicketComments'

const mockOnAddComment = vi.fn()

const fakeComments: TicketComment[] = [
  {
    id: 'c-1',
    ticketId: 'ticket-1',
    userId: 'user-1',
    userFullName: 'Juan Pérez',
    content: 'Hola, ¿alguna novedad?',
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: 'c-2',
    ticketId: 'ticket-1',
    userId: 'agent-42',
    userFullName: 'Laura García',
    content: 'Estamos revisando el caso.',
    createdAt: '2026-06-15T11:00:00Z',
  },
]

const fakeStatusLog: StatusLogEntry[] = [
  {
    id: 's-1',
    ticketId: 'ticket-1',
    fromStatus: 'abierto',
    toStatus: 'en_proceso',
    changedBy: 'agent-42',
    changedByFullName: 'Laura García',
    changedAt: '2026-06-15T10:30:00Z',
  },
]

const CLIENT_ID = 'user-1'

interface RenderOptions {
  isLoading?: boolean
  error?: string | null
  comments?: TicketComment[]
  statusLog?: StatusLogEntry[]
  ticketClientId?: string
  prefillContent?: string
  onPrefillConsumed?: () => void
}

function renderComments(ticketStatus: TicketStatus, overrides: RenderOptions = {}) {
  return render(
    <TicketComments
      comments={overrides.comments ?? fakeComments}
      statusLog={overrides.statusLog ?? fakeStatusLog}
      ticketClientId={overrides.ticketClientId ?? CLIENT_ID}
      onAddComment={mockOnAddComment}
      isLoading={overrides.isLoading ?? false}
      error={overrides.error ?? null}
      ticketStatus={ticketStatus}
      prefillContent={overrides.prefillContent}
      onPrefillConsumed={overrides.onPrefillConsumed}
    />,
  )
}

describe('TicketComments', () => {
  beforeEach(() => {
    mockOnAddComment.mockReset()
  })

  describe.each<TicketStatus>(['abierto', 'en_proceso', 'reabierto'])('when ticketStatus is %s', (status) => {
    it('renders the comment form', () => {
      renderComments(status)
      expect(screen.getByLabelText('Nuevo comentario')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument()
    })

    it('does not show the resolved-ticket notice', () => {
      renderComments(status)
      expect(screen.queryByText(/reabrilo para poder comentar/i)).not.toBeInTheDocument()
    })
  })

  describe('when ticketStatus is resuelto', () => {
    it('hides the comment form', () => {
      renderComments('resuelto')
      expect(screen.queryByLabelText('Nuevo comentario')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument()
    })

    it('shows the resolved-ticket notice', () => {
      renderComments('resuelto')
      expect(screen.getByText(/este ticket está resuelto/i)).toBeInTheDocument()
      expect(screen.getByText(/reabrilo para poder comentar/i)).toBeInTheDocument()
    })

    it('still shows the server error banner as a fallback', () => {
      renderComments('resuelto', { error: 'invalid_transition: No se pueden agregar comentarios.' })
      expect(screen.getByRole('alert')).toHaveTextContent('invalid_transition')
    })
  })

  it('still renders the existing comments list regardless of status', () => {
    renderComments('resuelto')
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.getByText('Hola, ¿alguna novedad?')).toBeInTheDocument()
  })

  describe('role badges', () => {
    it('shows "Cliente" badge for comment from the ticket client', () => {
      renderComments('abierto', {
        comments: [fakeComments[0]],
        statusLog: [],
        ticketClientId: CLIENT_ID,
      })
      // fakeComments[0].userId === CLIENT_ID
      expect(screen.getByText('Cliente')).toBeInTheDocument()
    })

    it('shows "Agente" badge for comment from a non-client user', () => {
      renderComments('abierto', {
        comments: [fakeComments[1]],
        statusLog: [],
        ticketClientId: CLIENT_ID,
      })
      // fakeComments[1].userId !== CLIENT_ID
      expect(screen.getByText('Agente')).toBeInTheDocument()
    })

    it('shows both badges when both client and agent have commented', () => {
      renderComments('abierto', {
        comments: fakeComments,
        statusLog: [],
        ticketClientId: CLIENT_ID,
      })
      expect(screen.getByText('Cliente')).toBeInTheDocument()
      expect(screen.getByText('Agente')).toBeInTheDocument()
    })
  })

  describe('status log entries in feed', () => {
    it('renders a status change entry as a system message', () => {
      renderComments('abierto', {
        comments: [],
        statusLog: fakeStatusLog,
        ticketClientId: CLIENT_ID,
      })
      expect(screen.getByText(/Laura García/)).toBeInTheDocument()
      expect(screen.getByText(/cambió el estado/)).toBeInTheDocument()
    })

    it('shows no activity message when both comments and statusLog are empty', () => {
      renderComments('abierto', { comments: [], statusLog: [], ticketClientId: CLIENT_ID })
      expect(screen.getByText('No hay actividad aún.')).toBeInTheDocument()
    })
  })

  describe('prefillContent', () => {
    it('populates the textarea when prefillContent is provided', () => {
      renderComments('abierto', { prefillContent: 'Respuesta sugerida por IA' })
      expect(screen.getByLabelText('Nuevo comentario')).toHaveValue('Respuesta sugerida por IA')
    })

    it('calls onPrefillConsumed after applying the prefill', () => {
      const mockOnPrefillConsumed = vi.fn()
      renderComments('abierto', {
        prefillContent: 'Respuesta sugerida por IA',
        onPrefillConsumed: mockOnPrefillConsumed,
      })
      expect(mockOnPrefillConsumed).toHaveBeenCalledOnce()
    })

    it('leaves the textarea untouched when prefillContent is not provided', () => {
      renderComments('abierto')
      expect(screen.getByLabelText('Nuevo comentario')).toHaveValue('')
    })
  })
})
