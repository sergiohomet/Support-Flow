import { z } from 'zod'

// ── Role constants (no TypeScript enums) ─────────────────────────────────────

export const USER_ROLE = {
  client: 'client',
  agent: 'agent',
  admin: 'admin',
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export const userRoleSchema = z.enum(['client', 'agent', 'admin'])

// ── AdminUser — maps snake_case RPC rows to camelCase ─────────────────────────

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  role: userRoleSchema,
  specialty: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export type AdminUser = z.infer<typeof adminUserSchema>

// ── CreateUserInput — used by Edge Function ───────────────────────────────────

export const createUserInputSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  temporaryPassword: z.string().min(8),
  role: z.enum(['agent', 'admin']),
  specialty: z.string().nullable(),
})

export type CreateUserInput = z.infer<typeof createUserInputSchema>

// ── RPC param schemas ─────────────────────────────────────────────────────────

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
