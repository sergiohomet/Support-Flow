import { z } from 'zod'

// ── ReportsSummary — mapea la fila del RPC admin_get_reports_summary ─────────

export const reportsSummarySchema = z.object({
  totalTickets: z.number(),
  avgResolutionHours: z.number().nullable(),
  slaCompliancePct: z.number().nullable(),
  escalatedCount: z.number(),
})

export type ReportsSummary = z.infer<typeof reportsSummarySchema>

export function mapReportsSummary(row: {
  total_tickets: number
  avg_resolution_hours: number | null
  sla_compliance_pct: number | null
  escalated_count: number
}): ReportsSummary {
  return {
    totalTickets: row.total_tickets,
    avgResolutionHours: row.avg_resolution_hours,
    slaCompliancePct: row.sla_compliance_pct,
    escalatedCount: row.escalated_count,
  }
}

// ── TicketsByCategory — mapea la fila de admin_get_reports_tickets_by_category ─

export const ticketsByCategorySchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  ticketCount: z.number(),
})

export type TicketsByCategory = z.infer<typeof ticketsByCategorySchema>

export function mapTicketsByCategory(row: {
  category_id: string
  category_name: string
  ticket_count: number
}): TicketsByCategory {
  return {
    categoryId: row.category_id,
    categoryName: row.category_name,
    ticketCount: row.ticket_count,
  }
}

// ── TicketsByWeek — mapea la fila del RPC admin_get_reports_tickets_by_week ──

export const ticketsByWeekSchema = z.object({
  weekStart: z.string(),
  ticketCount: z.number(),
})

export type TicketsByWeek = z.infer<typeof ticketsByWeekSchema>

export function mapTicketsByWeek(row: { week_start: string; ticket_count: number }): TicketsByWeek {
  return {
    weekStart: row.week_start,
    ticketCount: row.ticket_count,
  }
}

// ── AgentPerformance — mapea la fila de admin_get_reports_agent_performance ──

export const agentPerformanceSchema = z.object({
  agentId: z.string(),
  agentFullName: z.string(),
  resolvedCount: z.number(),
  avgWorkingHours: z.number().nullable(),
  slaCompliancePct: z.number().nullable(),
})

export type AgentPerformance = z.infer<typeof agentPerformanceSchema>

export function mapAgentPerformance(row: {
  agent_id: string
  agent_full_name: string
  resolved_count: number
  avg_working_hours: number | null
  sla_compliance_pct: number | null
}): AgentPerformance {
  return {
    agentId: row.agent_id,
    agentFullName: row.agent_full_name,
    resolvedCount: row.resolved_count,
    avgWorkingHours: row.avg_working_hours,
    slaCompliancePct: row.sla_compliance_pct,
  }
}
