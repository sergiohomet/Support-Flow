import { formatRelativeTime } from '@/core/utils/format'
import type { NotificationRow, NotificationType } from '../schemas'

interface NotificationCardProps {
  notification: NotificationRow
  onClick: (notification: NotificationRow) => void
}

const BORDER_COLOR: Record<NotificationType, string> = {
  sla_escalation: 'border-l-[#BC4800]',
  status_change: 'border-l-blue-600',
  reassignment: 'border-l-purple-600',
  new_comment: 'border-l-emerald-600',
}

const ICON_COLOR: Record<NotificationType, string> = {
  sla_escalation: 'text-[#BC4800]',
  status_change: 'text-blue-600',
  reassignment: 'text-purple-600',
  new_comment: 'text-emerald-600',
}

const ICON_NAME: Record<NotificationType, string> = {
  sla_escalation: 'warning',
  status_change: 'sync',
  // person_add is a confirmed-good classic Material Icons ligature in this
  // project — already rendering in UsersPage.tsx with the same `material-icons`
  // class, so no fallback to swap_horiz is needed here.
  reassignment: 'person_add',
  new_comment: 'chat',
}

export function NotificationCard({
  notification,
  onClick,
}: NotificationCardProps): React.JSX.Element {
  return (
    <div
      data-testid="notification-card"
      role="button"
      tabIndex={0}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick(notification)
      }}
      className={[
        'flex items-start gap-3 rounded-md border border-gray-200 border-l-4 bg-white px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors',
        BORDER_COLOR[notification.type],
      ].join(' ')}
    >
      <span className={['material-icons text-xl shrink-0', ICON_COLOR[notification.type]].join(' ')}>
        {ICON_NAME[notification.type]}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{notification.message}</p>
        <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(notification.createdAt)}</p>
      </div>

      {!notification.isRead && (
        <span
          data-testid="unread-indicator"
          aria-hidden="true"
          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600"
        />
      )}
    </div>
  )
}
