import { z } from 'zod'

// Schemas primitivos
export const ticketStatusSchema = z.enum(['abierto', 'en_proceso', 'resuelto', 'reabierto'])
export const ticketPrioritySchema = z.enum(['baja', 'media', 'alta', 'critica'])

// Ítem de listado (mapea la fila de get_tickets)
export const ticketListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  categoryId: z.string(),
  categoryName: z.string(),
  categoryIsActive: z.boolean(),
  clientId: z.string(),
  clientFullName: z.string(),
  agentId: z.string().nullable(),
  agentFullName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  commentCount: z.number(),
})

// Sugerencia de triage por IA (mapea la columna JSONB ai_triage, escrita por la
// Edge Function ai-triage). suggestedCategoryId es intencionalmente un
// z.string() plano — NO z.string().uuid() — porque los valores reales de
// categories.id de este proyecto (por ejemplo, 11111111-1111-1111-1111-111111111111) no pasan
// el chequeo estricto de formato RFC 4122 de Zod en los nibbles de versión/variante, tal
// como se detectó y corrigió del lado del servidor en supabase/functions/ai-triage/triage-logic.ts.
// confidence admite null porque el modelo a veces lo omite por completo
// (en ese caso, ya viene con default null del lado del servidor).
export const aiTriageSchema = z.object({
  suggestedCategoryId: z.string(),
  suggestedPriority: ticketPrioritySchema,
  suggestedResponse: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable(),
  generatedAt: z.string(),
})

export type AiTriage = z.infer<typeof aiTriageSchema>

// Detalle (mapea la fila de get_ticket_detail)
export const ticketDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  categoryId: z.string(),
  categoryName: z.string(),
  categoryIsActive: z.boolean(),
  clientId: z.string(),
  clientFullName: z.string(),
  agentId: z.string().nullable(),
  agentFullName: z.string().nullable(),
  aiTriage: aiTriageSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  escalatedAt: z.string().nullable(),
  slaHours: z.number().nullable(),
})

// Comentario (mapea la fila de get_ticket_comments)
export const ticketCommentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  userId: z.string(),
  userFullName: z.string(),
  content: z.string(),
  createdAt: z.string(),
})

// Entrada del registro de estados (mapea la fila de get_ticket_status_log)
export const statusLogEntrySchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  fromStatus: ticketStatusSchema.nullable(),
  toStatus: ticketStatusSchema,
  changedBy: z.string(),
  changedByFullName: z.string(),
  changedAt: z.string(),
})

// Categoría
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
})

// Agente
export const agentSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  activeTicketCount: z.number(),
})

// Formulario de creación de ticket (validación de la entrada del usuario)
export const createTicketInputSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(10),
  categoryId: z.string().min(1),
  priority: ticketPrioritySchema.optional().default('media'),
})

// Schemas de acciones con nombre (API pública requerida por el spec)
export const CreateTicketSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres.').max(120, 'El título no puede superar los 120 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  categoryId: z.string().min(1, 'Seleccioná una categoría.'),
  priority: ticketPrioritySchema.optional().default('media'),
})

export const UpdateStatusSchema = z.object({
  ticketId: z.string().min(1),
  newStatus: ticketStatusSchema,
})

export const AddCommentSchema = z.object({
  content: z.string().min(1, 'El comentario no puede estar vacío.').max(2000, 'El comentario no puede superar los 2000 caracteres.'),
})

// Tipos inferidos
export type TicketStatus = z.infer<typeof ticketStatusSchema>
export type TicketPriority = z.infer<typeof ticketPrioritySchema>
export type TicketListItem = z.infer<typeof ticketListItemSchema>
export type TicketDetail = z.infer<typeof ticketDetailSchema>
export type TicketComment = z.infer<typeof ticketCommentSchema>
export type StatusLogEntry = z.infer<typeof statusLogEntrySchema>
export type Category = z.infer<typeof categorySchema>
export type Agent = z.infer<typeof agentSchema>
export type CreateTicketInput = z.infer<typeof createTicketInputSchema>
