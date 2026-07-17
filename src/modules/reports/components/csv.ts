// Usa ';' como delimitador de campo y ',' como separador decimal — la
// convención que espera Excel bajo la configuración regional española/
// argentina. Con un delimitador ',', Excel en esa configuración regional
// interpreta el '.' de un número decimal como separador de miles,
// convirtiendo por ejemplo "21.194479345763888" en el entero
// 21194479345763888 y mostrándolo en notación científica.
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
