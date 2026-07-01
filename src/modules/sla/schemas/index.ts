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
