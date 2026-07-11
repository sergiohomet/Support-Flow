export type ComplianceTier = 'green' | 'amber' | 'red'

export function getComplianceTier(compliancePct: number | null): ComplianceTier {
  if (compliancePct === null) return 'red'
  if (compliancePct >= 80) return 'green'
  if (compliancePct >= 70) return 'amber'
  return 'red'
}

export function isTicketUrgent(minutesRemaining: number): boolean {
  return minutesRemaining < 60
}
