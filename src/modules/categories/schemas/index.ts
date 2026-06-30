import { z } from 'zod'

// ── Category — maps admin_list_categories RPC row ────────────────────────────
// Snake_case → camelCase mapping is done in the hook (not here),
// matching the pattern used in the users module.

export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  maxResolutionHours: z.number().nullable(),
})

export type Category = z.infer<typeof categorySchema>

// ── Form schemas ─────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(50, 'Máximo 50 caracteres'),
  description: z.string().optional(),
})

export const updateCategorySchema = createCategorySchema

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// ── Mapping helper — snake_case DB row → camelCase Category ──────────────────

export function mapCategory(row: {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  max_resolution_hours: number | null
}): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    maxResolutionHours: row.max_resolution_hours,
  }
}
