import { z } from 'zod'

// ── Enums re-declared locally (schema-independence convention — see
// src/modules/sla/schemas/index.ts). This module does NOT import from
// tickets/schemas, so it stays decoupled even if the tickets module's
// internal shape changes.

export const agentDashboardTicketStatusSchema = z.enum([
  'abierto',
  'en_proceso',
  'resuelto',
  'reabierto',
])
export const agentDashboardTicketPrioritySchema = z.enum(['baja', 'media', 'alta', 'critica'])

export type AgentDashboardTicketStatus = z.infer<typeof agentDashboardTicketStatusSchema>
export type AgentDashboardTicketPriority = z.infer<typeof agentDashboardTicketPrioritySchema>

// ── AgentDashboardTicket — maps get_tickets RPC row ──────────────────────────

export const agentDashboardTicketSchema = z.object({
  id: z.string(),
  title: z.string(),
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

// ── Mapping helper — snake_case DB row → camelCase AgentDashboardTicket ──────

export function mapAgentDashboardTicket(row: {
  id: string
  title: string
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
