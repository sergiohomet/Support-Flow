export function escapeCsvField(field: string | number): string {
  const value = String(field)
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escapeCsvField).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(','))
  }
  return lines.join('\n')
}
