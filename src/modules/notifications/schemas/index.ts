import { z } from 'zod'

// ── NotificationRow — maps get_notifications RPC row ──────────────────────
// Snake_case → camelCase mapping is done via mapNotification below,
// matching the pattern used in the sla module.

export const notificationTypeSchema = z.enum([
  'status_change',
  'sla_escalation',
  'reassignment',
  'new_comment',
])

export type NotificationType = z.infer<typeof notificationTypeSchema>

export const notificationRowSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  type: notificationTypeSchema,
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
})

export type NotificationRow = z.infer<typeof notificationRowSchema>

// ── Mapping helper — snake_case DB row → camelCase NotificationRow ────────

export function mapNotification(row: {
  id: string
  ticket_id: string
  type: NotificationType
  message: string
  is_read: boolean
  created_at: string
}): NotificationRow {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    type: row.type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

// ── Filter schema — used by useListNotifications ──────────────────────────

export const notificationFilterSchema = z.enum([
  'all',
  'unread',
  'status_change',
  'sla_escalation',
  'reassignment',
  'new_comment',
])

export type NotificationFilter = z.infer<typeof notificationFilterSchema>
