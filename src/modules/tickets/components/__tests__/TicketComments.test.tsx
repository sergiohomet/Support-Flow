import { render, screen } from '@testing-library/react'
import type { TicketComment, TicketStatus } from '@/modules/tickets/schemas'
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
]

function renderComments(
  ticketStatus: TicketStatus,
  overrides: { isLoading?: boolean; error?: string | null; comments?: TicketComment[] } = {},
) {
  return render(
    <TicketComments
      comments={overrides.comments ?? fakeComments}
      onAddComment={mockOnAddComment}
      isLoading={overrides.isLoading ?? false}
      error={overrides.error ?? null}
      ticketStatus={ticketStatus}
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
      expect(screen.getByRole('button', { name: 'Comentar' })).toBeInTheDocument()
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
      expect(screen.queryByRole('button', { name: 'Comentar' })).not.toBeInTheDocument()
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
})
