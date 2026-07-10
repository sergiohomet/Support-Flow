import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'El email es requerido.').email('Ingresá un email válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
    email: z.string().min(1, 'El email es requerido.').email('Ingresá un email válido.'),
    password: z
      .string()
      .min(1, 'La contraseña es requerida.')
      .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirm_password: z.string().min(1, 'Confirmá tu contraseña.'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirm_password'],
  })

export type RegisterFormData = z.infer<typeof registerSchema>

export const forgotPasswordRequestSchema = z.object({
  email: z.string().min(1, 'El email es requerido.'),
})

export type ForgotPasswordRequestData = z.infer<typeof forgotPasswordRequestSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'La contraseña es requerida.')
      .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirm_password: z.string().min(1, 'Confirmá tu contraseña.'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirm_password'],
  })

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>
