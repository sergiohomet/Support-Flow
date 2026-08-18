import { Pagination } from '@/ui/Pagination'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
import { NotificationCard } from './NotificationCard'
import type { NotificationRow } from '../schemas'

interface NotificationListProps {
  notifications: NotificationRow[]
  isLoading: boolean
  onNotificationClick: (notification: NotificationRow) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalCount: number
}

export function NotificationList({
  notifications,
  isLoading,
  onNotificationClick,
  page,
  totalPages,
  onPageChange,
  totalCount,
}: NotificationListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return <EmptyState title="No tenés notificaciones" description="Te avisaremos acá cuando haya novedades." />
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} onClick={onNotificationClick} />
        ))}
      </div>
      <Pagination
        currentPage={page}
        totalCount={totalCount}
        pageSize={20}
        onPageChange={onPageChange}
        className="mt-4"
      />
    </>
  )
}
