// Compact SLA countdown for card-style displays — a smaller sibling of
// src/modules/tickets/pages/slaStatus.ts (getSlaStatus), which returns richer
// box/text styling classes meant for a detail-page panel. This one returns
// only a label/icon/tone triple, small enough to render inline on a ticket
// card. The urgent threshold (< 120 minutes remaining) matches slaStatus.ts's
// isUrgent so both surfaces agree on when a ticket is "close to breaching".
export type SlaCountdownTone = 'normal' | 'warning' | 'danger'

export interface CompactSlaStatus {
  label: string
  icon: string
  tone: SlaCountdownTone
}

const URGENT_THRESHOLD_MINUTES = 120

export function getCompactSlaStatus(ticket: {
  escalatedAt: string | null
  slaHours: number | null
  createdAt: string
}): CompactSlaStatus {
  if (ticket.escalatedAt) {
    return { tone: 'danger', label: 'Vencido', icon: 'error' }
  }

  if (ticket.slaHours == null) {
    return { tone: 'normal', label: 'Sin SLA', icon: 'schedule' }
  }

  const deadline = new Date(ticket.createdAt).getTime() + ticket.slaHours * 60 * 60 * 1000
  const minutesRemaining = Math.round((deadline - Date.now()) / 60000)

  if (minutesRemaining < 0) {
    // Defensive: the escalation job should have set escalatedAt by now, but
    // handle a not-yet-escalated overdue ticket the same as escalated.
    return { tone: 'danger', label: 'Vencido', icon: 'error' }
  }

  const hours = Math.floor(minutesRemaining / 60)
  const minutes = minutesRemaining % 60
  const label = `${hours}h ${minutes}m`

  if (minutesRemaining < URGENT_THRESHOLD_MINUTES) {
    return { tone: 'warning', label, icon: 'schedule' }
  }

  return { tone: 'normal', label, icon: 'schedule' }
}
