import type { TicketStatus } from '@/modules/tickets/schemas'

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export interface SlaStatus {
  label: string
  detail?: string
  boxClass: string
  iconClass: string
  textClass: string
  icon: string
}

export function getSlaStatus(ticket: {
  status: TicketStatus
  escalatedAt: string | null
  slaHours: number | null
  createdAt: string
}): SlaStatus {
  if (ticket.escalatedAt) {
    return {
      label: 'SLA incumplido',
      detail: `Escalado el ${formatDate(ticket.escalatedAt)}`,
      boxClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-600',
      textClass: 'text-red-700',
      icon: 'error',
    }
  }

  if (ticket.status === 'resuelto') {
    return {
      label: 'Resuelto dentro del SLA',
      boxClass: 'bg-green-50 border-green-200',
      iconClass: 'text-green-600',
      textClass: 'text-green-700',
      icon: 'check_circle',
    }
  }

  if (ticket.slaHours == null) {
    return {
      label: 'No configurado',
      boxClass: 'bg-gray-50 border-gray-200',
      iconClass: 'text-gray-400',
      textClass: 'text-gray-500',
      icon: 'schedule',
    }
  }

  const deadline = new Date(ticket.createdAt).getTime() + ticket.slaHours * 60 * 60 * 1000
  const minutesRemaining = Math.round((deadline - Date.now()) / 60000)

  if (minutesRemaining <= 0) {
    return {
      label: 'Vencido — pendiente de escalar',
      boxClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-600',
      textClass: 'text-red-700',
      icon: 'error',
    }
  }

  const hours = Math.floor(minutesRemaining / 60)
  const minutes = minutesRemaining % 60
  const remaining = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  const isUrgent = minutesRemaining < 120

  return {
    label: `Vence en ${remaining}`,
    boxClass: isUrgent ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200',
    iconClass: isUrgent ? 'text-amber-600' : 'text-blue-600',
    textClass: isUrgent ? 'text-amber-700' : 'text-blue-700',
    icon: 'schedule',
  }
}
