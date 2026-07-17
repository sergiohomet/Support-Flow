// Countdown de SLA compacto para displays tipo card — un hermano más chico
// de src/modules/tickets/pages/slaStatus.ts (getSlaStatus), que devuelve
// clases de estilo box/text más ricas pensadas para un panel de página de
// detalle. Este solo devuelve una tripleta label/icon/tone, lo
// suficientemente chica para renderizarse inline en una card de ticket. El
// umbral de urgencia (< 120 minutos restantes) coincide con el isUrgent de
// slaStatus.ts, para que ambas superficies coincidan en cuándo un ticket
// está "cerca de incumplir" (breaching).
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
    // Defensivo: el job de escalamiento debería haber seteado escalatedAt
    // para este momento, pero manejamos un ticket vencido que todavía no
    // fue escalado igual que uno escalado.
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
