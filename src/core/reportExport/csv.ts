import type { ReportSection } from './types'

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

function buildSectionLines(section: ReportSection): string[] {
  const lines = [`# ${section.title}`, section.headers.map(escapeCsvField).join(';')]
  for (const row of section.rows) {
    lines.push(row.map(escapeCsvField).join(';'))
  }
  return lines
}

// Combina todas las secciones en un único CSV (no un ZIP de archivos por
// sección). Cada sección se separa de la siguiente con una línea en blanco;
// no se agrega línea en blanco final. Las filas con valor cero (p. ej. KPIs
// en cero) siempre se incluyen — nunca se omiten por estar "vacías".
export function buildMultiSectionCsv(sections: ReportSection[]): string {
  return sections.map((section) => buildSectionLines(section).join('\n')).join('\n\n')
}
