// Uses ';' as the field delimiter and ',' as the decimal separator — the
// convention Excel expects under Spanish/Argentine regional settings. With a
// ',' delimiter, Excel in that locale reads the '.' in a decimal number as a
// thousands separator, turning e.g. "21.194479345763888" into the integer
// 21194479345763888 and rendering it in scientific notation.
export function escapeCsvField(field: string | number): string {
  const value = typeof field === 'number' ? field.toString().replace('.', ',') : field
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escapeCsvField).join(';')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(';'))
  }
  return lines.join('\n')
}
