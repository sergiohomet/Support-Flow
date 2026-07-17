import { z } from 'zod'

// ── Enums redeclarados localmente (convención de independencia de schema
// — ver src/modules/sla/schemas/index.ts). Este módulo NO importa desde
// tickets/schemas, así que se mantiene desacoplado aunque cambie la forma
// interna del módulo tickets.

export const agentDashboardTicketStatusSchema = z.enum([
  'abierto',
  'en_proceso',
  'resuelto',
  'reabierto',
])
export const agentDashboardTicketPrioritySchema = z.enum(['baja', 'media', 'alta', 'critica'])

export type AgentDashboardTicketStatus = z.infer<typeof agentDashboardTicketStatusSchema>
export type AgentDashboardTicketPriority = z.infer<typeof agentDashboardTicketPrioritySchema>

// ── AgentDashboardTicket — mapea la fila del RPC get_tickets ─────────────────

export const agentDashboardTicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: agentDashboardTicketStatusSchema,
  priority: agentDashboardTicketPrioritySchema,
  categoryId: z.string(),
  categoryName: z.string(),
  agentId: z.string().nullable(),
  agentFullName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  escalatedAt: z.string().nullable(),
  slaHours: z.number().nullable(),
  commentCount: z.number(),
})

export type AgentDashboardTicket = z.infer<typeof agentDashboardTicketSchema>

// ── Helper de mapeo — fila de DB en snake_case → AgentDashboardTicket en camelCase ──────

export function mapAgentDashboardTicket(row: {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category_id: string
  category_name: string
  agent_id: string | null
  agent_full_name: string | null
  created_at: string
  updated_at: string
  escalated_at: string | null
  sla_hours: number | null
  comment_count: number
}): AgentDashboardTicket {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as AgentDashboardTicketStatus,
    priority: row.priority as AgentDashboardTicketPriority,
    categoryId: row.category_id,
    categoryName: row.category_name,
    agentId: row.agent_id,
    agentFullName: row.agent_full_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    escalatedAt: row.escalated_at,
    slaHours: row.sla_hours,
    commentCount: row.comment_count,
  }
}
