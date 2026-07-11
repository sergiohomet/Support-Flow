import type { TicketStatus } from '@/modules/tickets/schemas'

export const AGENT_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  abierto: ['en_proceso', 'resuelto'],
  en_proceso: ['resuelto', 'abierto'],
  resuelto: ['reabierto'],
  reabierto: ['en_proceso', 'resuelto'],
}
