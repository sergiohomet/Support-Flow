// Páginas
export { TicketListPage } from './pages/TicketListPage'
export { CreateTicketPage } from './pages/CreateTicketPage'
export { TicketDetailPage } from './pages/TicketDetailPage'

// Hooks
export { useTicketList } from './hooks/useTicketList'
export { useCategoryList } from './hooks/useCategoryList'
export { useAgentList } from './hooks/useAgentList'
export { useTicketDetail } from './hooks/useTicketDetail'
export { useCreateTicket } from './hooks/useCreateTicket'
export { useReassignTicket } from './hooks/useReassignTicket'
export { useUpdateTicketStatus } from './hooks/useUpdateTicketStatus'
export { useAddComment } from './hooks/useAddComment'

// Schemas (valores)
export {
  ticketStatusSchema,
  ticketPrioritySchema,
  ticketListItemSchema,
  ticketDetailSchema,
  ticketCommentSchema,
  statusLogEntrySchema,
  categorySchema,
  agentSchema,
  createTicketInputSchema,
} from './schemas'

// Schemas (tipos)
export type {
  TicketStatus,
  TicketPriority,
  TicketListItem,
  TicketDetail,
  TicketComment,
  StatusLogEntry,
  Category,
  Agent,
  CreateTicketInput,
} from './schemas'
