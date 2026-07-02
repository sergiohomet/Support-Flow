import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListNotifications } from '@/modules/notifications/hooks/useListNotifications'
import { useMarkNotificationRead } from '@/modules/notifications/hooks/useMarkNotificationRead'
import { useMarkAllNotificationsRead } from '@/modules/notifications/hooks/useMarkAllNotificationsRead'
import { NotificationFilterPills } from '@/modules/notifications/components/NotificationFilterPills'
import { NotificationList } from '@/modules/notifications/components/NotificationList'
import type { NotificationFilter, NotificationRow } from '@/modules/notifications/schemas'

export function NotificationsPage(): React.JSX.Element {
  const [filter, setFilter] = useState<NotificationFilter>('unread')
  // Tracks ids marked read during this session so the card can flip to "read"
  // immediately on click, without waiting for a refetch — the list is only
  // refetched explicitly (e.g. after "Marcar todas como leídas"), so this
  // local override is the simplest way to reflect the optimistic read state
  // on top of whatever `data` currently holds.
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set())

  const { data, isLoading, refetch } = useListNotifications(filter)
  const { execute: markNotificationRead } = useMarkNotificationRead()
  const { execute: markAllNotificationsRead } = useMarkAllNotificationsRead()
  const navigate = useNavigate()

  const notifications = data.map((notification) =>
    locallyReadIds.has(notification.id) ? { ...notification, isRead: true } : notification
  )

  const handleNotificationClick = (notification: NotificationRow): void => {
    setLocallyReadIds((prev) => new Set(prev).add(notification.id))
    navigate('/tickets/' + notification.ticketId)
    // Fire-and-forget: navigation must not block on the mark-as-read call.
    void markNotificationRead(notification.id)
  }

  const handleMarkAllRead = async (): Promise<void> => {
    const ok = await markAllNotificationsRead()
    if (!ok) return
    void refetch()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notificaciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Novedades sobre tus tickets: cambios de estado, escalamientos SLA, reasignaciones y comentarios nuevos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Marcar todas como leídas
        </button>
      </div>

      <div className="mb-6">
        <NotificationFilterPills active={filter} onChange={setFilter} />
      </div>

      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  )
}
