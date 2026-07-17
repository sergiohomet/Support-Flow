import { useState } from 'react'
import type { z } from 'zod'

export function useValidatedSubmit<T extends z.ZodTypeAny>(
  schema: T,
  onValid: (data: z.output<T>) => void,
) {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({})

  const submit = (raw: unknown): void => {
    const result = schema.safeParse(raw)
    if (!result.success) {
      const errors: Partial<Record<string, string>> = {}
      for (const issue of result.error.issues) {
        const field = String(issue.path[0])
        if (!errors[field]) errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    onValid(result.data)
  }

  const reset = (): void => setFieldErrors({})

  return { fieldErrors, submit, reset }
}

/**
 * Primitiva de validación sin hook para llamadores que no pueden usar
 * `useValidatedSubmit` directamente — por ejemplo, validar una fila a la vez
 * dentro de un loop de envío por lote/por fila, donde los errores se
 * indexan por id de fila en vez de por campo del schema.
 */
export function parseWithFirstError<T extends z.ZodTypeAny>(
  schema: T,
  raw: unknown,
): { success: true; data: z.output<T> } | { success: false; message: string } {
  const result = schema.safeParse(raw)
  if (!result.success) {
    return { success: false, message: result.error.issues[0]?.message ?? 'Valor inválido' }
  }
  return { success: true, data: result.data }
}
