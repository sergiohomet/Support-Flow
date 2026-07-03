import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationCard } from '../NotificationCard'
import type { NotificationRow } from '../../schemas'

function buildNotification(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: 'notif-1',
    ticketId: 'ticket-1',
    type: 'status_change',
    message: 'Tu ticket cambió de estado: en progreso',
    isRead: false,
    createdAt: '2026-07-02T11:55:00Z',
    ...overrides,
  }
}

describe('NotificationCard', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-07-02T12:00:00Z'))
  })

  it('renders the message text', () => {
    render(<NotificationCard notification={buildNotification()} onClick={vi.fn()} />)

    expect(screen.getByText('Tu ticket cambió de estado: en progreso')).toBeInTheDocument()
  })

  it('applies the status_change border and icon color classes', () => {
    render(
      <NotificationCard
        notification={buildNotification({ type: 'status_change' })}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByTestId('notification-card')).toHaveClass('border-l-blue-600')
    expect(screen.getByText('sync')).toHaveClass('text-blue-600')
  })

  it('applies the sla_escalation border and icon color classes', () => {
    render(
      <NotificationCard
        notification={buildNotification({ type: 'sla_escalation' })}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByTestId('notification-card')).toHaveClass('border-l-[#BC4800]')
    expect(screen.getByText('warning')).toHaveClass('text-[#BC4800]')
  })

  it('applies the reassignment border and icon color classes using person_add', () => {
    render(
      <NotificationCard
        notification={buildNotification({ type: 'reassignment' })}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByTestId('notification-card')).toHaveClass('border-l-purple-600')
    expect(screen.getByText('person_add')).toHaveClass('text-purple-600')
  })

  it('applies the new_comment border and icon color classes', () => {
    render(
      <NotificationCard
        notification={buildNotification({ type: 'new_comment' })}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByTestId('notification-card')).toHaveClass('border-l-emerald-600')
    expect(screen.getByText('chat')).toHaveClass('text-emerald-600')
  })

  it('renders an unread indicator when isRead is false', () => {
    render(<NotificationCard notification={buildNotification({ isRead: false })} onClick={vi.fn()} />)

    expect(screen.getByTestId('unread-indicator')).toBeInTheDocument()
  })

  it('does not render an unread indicator when isRead is true', () => {
    render(<NotificationCard notification={buildNotification({ isRead: true })} onClick={vi.fn()} />)

    expect(screen.queryByTestId('unread-indicator')).not.toBeInTheDocument()
  })

  it('renders the formatted relative timestamp', () => {
    // createdAt is 5 minutes before the mocked system time
    render(<NotificationCard notification={buildNotification()} onClick={vi.fn()} />)

    expect(screen.getByText('hace 5 minutos')).toBeInTheDocument()
  })

  it('calls onClick with the notification when the card is clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const notification = buildNotification()
    render(<NotificationCard notification={notification} onClick={onClick} />)

    await user.click(screen.getByTestId('notification-card'))

    expect(onClick).toHaveBeenCalledWith(notification)
  })
})
