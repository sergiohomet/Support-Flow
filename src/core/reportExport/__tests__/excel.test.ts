import ExcelJS from 'exceljs'
import { buildExcelBlob, buildExcelWorkbookBuffer } from '../excel'
import type { ReportSection } from '../types'

async function loadWorkbook(sections: ReportSection[]): Promise<ExcelJS.Workbook> {
  const buffer = await buildExcelWorkbookBuffer(sections)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)
  return workbook
}

describe('buildExcelWorkbookBuffer', () => {
  it('crea una hoja por cada sección, con el mismo orden y cantidad', async () => {
    const sections: ReportSection[] = [
      { title: 'Resumen', headers: ['Métrica', 'Valor'], rows: [['Tickets abiertos', 10]] },
      { title: 'Agentes', headers: ['Agente', 'Tiempo prom.'], rows: [['Ana', 21.2]] },
    ]

    const workbook = await loadWorkbook(sections)

    expect(workbook.worksheets).toHaveLength(2)
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Agentes'])
  })

  it('sanitiza el título de la sección para usarlo como nombre de hoja (caracteres prohibidos y límite de 31)', async () => {
    const longTitle = 'Categorías: Soporte/Ventas [Q1] * reporte?'
    const sections: ReportSection[] = [{ title: longTitle, headers: ['A'], rows: [] }]

    const workbook = await loadWorkbook(sections)
    const sheetName = workbook.worksheets[0]?.name ?? ''

    expect(sheetName.length).toBeLessThanOrEqual(31)
    expect(sheetName).not.toMatch(/[\\/?*[\]:]/)
  })

  it('escribe la fila de headers en negrita como primera fila', async () => {
    const sections: ReportSection[] = [
      { title: 'Resumen', headers: ['Métrica', 'Valor'], rows: [['Tickets abiertos', 10]] },
    ]

    const workbook = await loadWorkbook(sections)
    const sheet = workbook.worksheets[0]
    const headerRow = sheet?.getRow(1)

    expect(headerRow?.getCell(1).value).toBe('Métrica')
    expect(headerRow?.getCell(1).font?.bold).toBe(true)
  })

  it('una sección sin filas igual crea una hoja solo con el header', async () => {
    const sections: ReportSection[] = [{ title: 'Vacía', headers: ['Columna A'], rows: [] }]

    const workbook = await loadWorkbook(sections)
    const sheet = workbook.worksheets[0]

    expect(sheet?.rowCount).toBe(1)
    expect(sheet?.getRow(1).getCell(1).value).toBe('Columna A')
  })

  it('mantiene las celdas numéricas como números, no como strings con coma decimal', async () => {
    const sections: ReportSection[] = [
      { title: 'Agentes', headers: ['Agente', 'Tiempo prom.'], rows: [['Ana', 21.194479345763888]] },
    ]

    const workbook = await loadWorkbook(sections)
    const dataCell = workbook.worksheets[0]?.getRow(2).getCell(2)

    expect(dataCell?.value).toBe(21.194479345763888)
    expect(typeof dataCell?.value).toBe('number')
  })
})

describe('buildExcelBlob', () => {
  it('devuelve un Blob con el MIME type de xlsx', async () => {
    const sections: ReportSection[] = [{ title: 'Resumen', headers: ['A'], rows: [] }]

    const blob = await buildExcelBlob(sections)

    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(blob.size).toBeGreaterThan(0)
  })
})
