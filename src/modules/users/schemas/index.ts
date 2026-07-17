import { z } from 'zod'

// ── Constantes de rol (sin enums de TypeScript) ───────────────────────────────

export const USER_ROLE = {
  client: 'client',
  agent: 'agent',
  admin: 'admin',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const userRoleSchema = z.enum(['client', 'agent', 'admin'])

// ── AdminUser — mapea filas RPC en snake_case a camelCase ─────────────────────

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export type AdminUser = z.infer<typeof adminUserSchema>

// ── CreateUserInput — usado por la Edge Function ───────────────────────────────

/**
 * Fuente única de verdad para la regla de negocio "un agente requiere una categoría".
 * Compartida entre el refine de createUserInputSchema y los componentes de UI que
 * necesitan derivar un estado válido/deshabilitado sin duplicar la regla en línea.
 */
export function isAgentCategoryValid(role: 'agent' | 'admin', categoryId: string | null): boolean {
  return role !== 'agent' || (categoryId !== null && categoryId !== '')
}

export const createUserInputSchema = z
  .object({
    fullName: z.string().min(1),
    email: z.string().email(),
    temporaryPassword: z.string().min(8),
    role: z.enum(['agent', 'admin']),
    categoryId: z.string().nullable(),
  })
  .refine((data) => isAgentCategoryValid(data.role, data.categoryId), {
    message: 'La especialidad es obligatoria para agentes',
    path: ['categoryId'],
  })

export type CreateUserInput = z.infer<typeof createUserInputSchema>

// ── Schemas de parámetros RPC ──────────────────────────────────────────────────

export const UpdateUserRoleParamsSchema = z.object({
  userId: z.string(),
  newRole: userRoleSchema,
})

export type UpdateUserRoleParams = z.infer<typeof UpdateUserRoleParamsSchema>

export const ToggleUserStatusParamsSchema = z.object({
  userId: z.string(),
  isActive: z.boolean(),
})

export type ToggleUserStatusParams = z.infer<typeof ToggleUserStatusParamsSchema>
