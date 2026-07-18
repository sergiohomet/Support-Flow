import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportSection } from './types'

// A partir de esta cantidad de columnas en el header de CUALQUIER sección, el
// documento COMPLETO se genera en orientación apaisada (no por sección) —
// evita que columnas angostas de otras secciones se corten en modo vertical.
const LANDSCAPE_MIN_COLUMNS = 5
const TOP_MARGIN = 20
const SECTION_TITLE_TO_TABLE_GAP = 6
const SECTION_GAP = 10

// `jspdf-autotable` escribe `doc.lastAutoTable` como efecto secundario, pero
// el tipo de `jsPDF` no lo declara — se extiende localmente para leerlo.
interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number }
}

// Construye el documento (sin serializarlo) para poder testear la cantidad de
// llamadas a `autoTable` y sus argumentos, sin necesidad de parsear el PDF
// binario resultante.
export function buildPdfDocument(sections: ReportSection[]): jsPDF {
  const isLandscape = sections.some((section) => section.headers.length >= LANDSCAPE_MIN_COLUMNS)
  const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' }) as JsPdfWithAutoTable

  let cursorY = TOP_MARGIN

  for (const section of sections) {
    doc.text(section.title, 14, cursorY)
    autoTable(doc, {
      head: [section.headers],
      body: section.rows,
      startY: cursorY + SECTION_TITLE_TO_TABLE_GAP,
    })
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + SECTION_GAP
  }

  return doc
}

export function buildPdfBlob(sections: ReportSection[]): Blob {
  return buildPdfDocument(sections).output('blob')
}
