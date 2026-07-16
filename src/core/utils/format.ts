export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateOnly(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' })

export function formatRelativeTime(date: string | Date): string {
  const target = new Date(date)
  const diffSeconds = Math.round((target.getTime() - Date.now()) / 1000)
  const diffSecondsAbs = Math.abs(diffSeconds)

  if (diffSecondsAbs < 60) {
    // "hace unos segundos" reads more naturally than a numeric "hace 15 segundos"
    // for such a short, imprecise window, so it's hardcoded rather than formatted.
    return 'hace unos segundos'
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffSeconds / 3600)
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffSeconds / 86400)
  return relativeTimeFormatter.format(diffDays, 'day')
}
