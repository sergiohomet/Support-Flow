import ExcelJS from 'exceljs'
import type { ReportSection } from './types'

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Excel prohíbe estos caracteres en nombres de hoja y limita el nombre a 31
// caracteres. Se despojan los caracteres inválidos antes de truncar.
function sanitizeSheetName(title: string): string {
  return title.replace(/[\\/?*[\]:]/g, '').slice(0, 31)
}

function writeSection(workbook: ExcelJS.Workbook, section: ReportSection): void {
  const sheet = workbook.addWorksheet(sanitizeSheetName(section.title))
  const headerRow = sheet.addRow(section.headers)
  headerRow.font = { bold: true }

  for (const row of section.rows) {
    sheet.addRow(row)
  }
}

// Construye un workbook con una hoja real por sección (no todo en una sola
// hoja). Los valores numéricos se escriben tal cual — Excel resuelve su
// propio formato regional, a diferencia del CSV que necesita el truco de
// coma decimal.
export async function buildExcelWorkbookBuffer(sections: ReportSection[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()

  for (const section of sections) {
    writeSection(workbook, section)
  }

  return workbook.xlsx.writeBuffer()
}

export async function buildExcelBlob(sections: ReportSection[]): Promise<Blob> {
  const buffer = await buildExcelWorkbookBuffer(sections)
  return new Blob([buffer], { type: EXCEL_MIME_TYPE })
}
