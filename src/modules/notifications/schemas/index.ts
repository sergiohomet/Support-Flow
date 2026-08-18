import { z } from 'zod'

// ── NotificationRow — mapea la fila del RPC get_notifications ─────────────
// El mapeo de snake_case → camelCase se hace mediante mapNotification más
// abajo, siguiendo el mismo patrón usado en el módulo sla.

export const notificationTypeSchema = z.enum([
  'status_change',
  'sla_escalation',
  'reassignment',
  'new_comment',
  'new_ticket',
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

// ── Helper de mapeo — fila snake_case de la DB → NotificationRow camelCase ─

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

// ── Schema de filtro — usado por useListNotifications ──────────────────────

export const notificationFilterSchema = z.enum([
  'all',
  'unread',
  'status_change',
  'sla_escalation',
  'reassignment',
  'new_comment',
  'new_ticket',
])

export type NotificationFilter = z.infer<typeof notificationFilterSchema>
