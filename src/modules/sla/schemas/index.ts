import { z } from 'zod'

// ── SlaConfigRow — maps admin_get_sla_config RPC row ─────────────────────────
// Snake_case → camelCase mapping is done via mapSlaConfig below,
// matching the pattern used in the categories module.

export const slaConfigRowSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  maxResolutionHours: z.number(),
  escalationEnabled: z.boolean(),
  updatedAt: z.string(),
})

export type SlaConfigRow = z.infer<typeof slaConfigRowSchema>

// ── Form schema ────────────────────────────────────────────────────────────

export const updateSlaConfigSchema = z.object({
  maxResolutionHours: z
    .number()
    .min(1, 'Las horas máximas deben estar entre 1 y 999')
    .max(999, 'Las horas máximas deben estar entre 1 y 999'),
  escalationEnabled: z.boolean(),
})

export type UpdateSlaConfigInput = z.infer<typeof updateSlaConfigSchema>

// ── Mapping helper — snake_case DB row → camelCase SlaConfigRow ──────────────

export function mapSlaConfig(row: {
  category_id: string
  category_name: string
  max_resolution_hours: number
  escalation_enabled: boolean
  updated_at: string
}): SlaConfigRow {
  return {
    categoryId: row.category_id,
    categoryName: row.category_name,
    maxResolutionHours: row.max_resolution_hours,
    escalationEnabled: row.escalation_enabled,
    updatedAt: row.updated_at,
  }
}

// ── SlaDashboardSummary — maps admin_get_sla_dashboard RPC row ───────────────

export const slaDashboardSummarySchema = z.object({
  totalTickets: z.number(),
  resolvedInSla: z.number(),
  escalatedCount: z.number(),
})

export type SlaDashboardSummary = z.infer<typeof slaDashboardSummarySchema>

export function mapSlaDashboardSummary(row: {
  total_tickets: number
  resolved_in_sla: number
  escalated_count: number
}): SlaDashboardSummary {
  return {
    totalTickets: row.total_tickets,
    resolvedInSla: row.resolved_in_sla,
    escalatedCount: row.escalated_count,
  }
}

// ── SlaComplianceByCategory — maps admin_get_sla_compliance_by_category row ──

export const slaComplianceByCategorySchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  maxResolutionHours: z.number(),
  resolvedCount: z.number(),
  totalCount: z.number(),
  compliancePct: z.number().nullable(),
})

export type SlaComplianceByCategory = z.infer<typeof slaComplianceByCategorySchema>

export function mapSlaComplianceByCategory(row: {
  category_id: string
  category_name: string
  max_resolution_hours: number
  resolved_count: number
  total_count: number
  compliance_pct: number | null
}): SlaComplianceByCategory {
  return {
    categoryId: row.category_id,
    categoryName: row.category_name,
    maxResolutionHours: row.max_resolution_hours,
    resolvedCount: row.resolved_count,
    totalCount: row.total_count,
    compliancePct: row.compliance_pct,
  }
}

// ── AtRiskTicket — maps admin_get_sla_at_risk_tickets RPC row ────────────────

export const atRiskTicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  categoryName: z.string(),
  agentFullName: z.string(),
  minutesRemaining: z.number(),
})

export type AtRiskTicket = z.infer<typeof atRiskTicketSchema>

export function mapAtRiskTicket(row: {
  id: string
  title: string
  category_name: string
  agent_full_name: string
  minutes_remaining: number
}): AtRiskTicket {
  return {
    id: row.id,
    title: row.title,
    categoryName: row.category_name,
    agentFullName: row.agent_full_name,
    minutesRemaining: row.minutes_remaining,
  }
}
