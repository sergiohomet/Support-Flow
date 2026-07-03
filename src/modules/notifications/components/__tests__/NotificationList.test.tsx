import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationList } from '../NotificationList'
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

describe('NotificationList', () => {
  it('renders one NotificationCard per notification row', () => {
    const notifications = [
      buildNotification({ id: 'notif-1', message: 'Primera notificación' }),
      buildNotification({ id: 'notif-2', message: 'Segunda notificación' }),
    ]

    render(
      <NotificationList
        notifications={notifications}
        isLoading={false}
        onNotificationClick={vi.fn()}
      />
    )

    expect(screen.getByText('Primera notificación')).toBeInTheDocument()
    expect(screen.getByText('Segunda notificación')).toBeInTheDocument()
    expect(screen.getAllByTestId('notification-card')).toHaveLength(2)
  })

  it('renders EmptyState when there are no notifications and it is not loading', () => {
    render(<NotificationList notifications={[]} isLoading={false} onNotificationClick={vi.fn()} />)

    expect(screen.queryAllByTestId('notification-card')).toHaveLength(0)
    expect(screen.getByText(/no (hay|tenés)/i)).toBeInTheDocument()
  })

  it('renders Spinner when isLoading is true', () => {
    render(<NotificationList notifications={[]} isLoading={true} onNotificationClick={vi.fn()} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryAllByTestId('notification-card')).toHaveLength(0)
  })

  it('passes onNotificationClick through to each card onClick', async () => {
    const user = userEvent.setup()
    const onNotificationClick = vi.fn()
    const notification = buildNotification()

    render(
      <NotificationList
        notifications={[notification]}
        isLoading={false}
        onNotificationClick={onNotificationClick}
      />
    )

    await user.click(screen.getByTestId('notification-card'))

    expect(onNotificationClick).toHaveBeenCalledWith(notification)
  })
})
