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

  const {
    data: notifications,
    isLoading,
    refetch,
    markLocallyRead,
    page,
    totalPages,
    setPage,
    totalCount,
  } = useListNotifications(filter)

  const { execute: markNotificationRead } = useMarkNotificationRead()
  const { execute: markAllNotificationsRead } = useMarkAllNotificationsRead()
  const navigate = useNavigate()

  const handleNotificationClick = (notification: NotificationRow): void => {
    markLocallyRead(notification.id)
    navigate('/tickets/' + notification.ticketId)
    // Fire-and-forget: la navegación no debe bloquearse esperando la llamada de marcar como leído.
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
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={totalCount}
      />
    </div>
  )
}
