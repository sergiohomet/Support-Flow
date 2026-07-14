import { z } from 'zod'

// Primitive schemas
export const ticketStatusSchema = z.enum(['abierto', 'en_proceso', 'resuelto', 'reabierto'])
export const ticketPrioritySchema = z.enum(['baja', 'media', 'alta', 'critica'])

// List item (maps get_tickets row)
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

// AI triage suggestion (maps the ai_triage JSONB column, written by the
// ai-triage Edge Function). suggestedCategoryId is intentionally a plain
// z.string() — NOT z.string().uuid() — because this project's real
// categories.id values (e.g. 11111111-1111-1111-1111-111111111111) fail
// Zod's strict RFC 4122 format check on version/variant nibbles, exactly as
// found and fixed server-side in supabase/functions/ai-triage/triage-logic.ts.
// confidence is nullable because the model sometimes omits it entirely
// (already defaulted to null server-side in that case).
export const aiTriageSchema = z.object({
  suggestedCategoryId: z.string(),
  suggestedPriority: ticketPrioritySchema,
  suggestedResponse: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable(),
  generatedAt: z.string(),
})

export type AiTriage = z.infer<typeof aiTriageSchema>

// Detail (maps get_ticket_detail row)
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

// Comment (maps get_ticket_comments row)
export const ticketCommentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  userId: z.string(),
  userFullName: z.string(),
  content: z.string(),
  createdAt: z.string(),
})

// Status log entry (maps get_ticket_status_log row)
export const statusLogEntrySchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  fromStatus: ticketStatusSchema.nullable(),
  toStatus: ticketStatusSchema,
  changedBy: z.string(),
  changedByFullName: z.string(),
  changedAt: z.string(),
})

// Category
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
})

// Agent
export const agentSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  activeTicketCount: z.number(),
})

// Create ticket form (user input validation)
export const createTicketInputSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(10),
  categoryId: z.string().min(1),
  priority: ticketPrioritySchema.optional().default('media'),
})

// Named action schemas (spec-required public API)
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

// Inferred types
export type TicketStatus = z.infer<typeof ticketStatusSchema>
export type TicketPriority = z.infer<typeof ticketPrioritySchema>
export type TicketListItem = z.infer<typeof ticketListItemSchema>
export type TicketDetail = z.infer<typeof ticketDetailSchema>
export type TicketComment = z.infer<typeof ticketCommentSchema>
export type StatusLogEntry = z.infer<typeof statusLogEntrySchema>
export type Category = z.infer<typeof categorySchema>
export type Agent = z.infer<typeof agentSchema>
export type CreateTicketInput = z.infer<typeof createTicketInputSchema>
