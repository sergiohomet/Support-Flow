export function formatMinutesRemaining(minutesRemaining: number): string {
  if (minutesRemaining < 0) return 'Vencido'
  if (minutesRemaining >= 60) {
    const hours = Math.floor(minutesRemaining / 60)
    const minutes = minutesRemaining % 60
    return `${hours}h ${minutes}m`
  }
  return `${minutesRemaining}m`
}
