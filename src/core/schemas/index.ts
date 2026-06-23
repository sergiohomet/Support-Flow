import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export type LoginFormData = z.infer<typeof LoginSchema>
export type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>

export const RegisterSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type RegisterInput = z.infer<typeof RegisterSchema>

// Ticket action schemas (re-exported from module — do NOT move them here)
export { CreateTicketSchema, UpdateStatusSchema, AddCommentSchema } from '@/modules/tickets/schemas'
