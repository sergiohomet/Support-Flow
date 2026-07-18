import autoTable from 'jspdf-autotable'
import { buildPdfBlob, buildPdfDocument } from '../pdf'
import type { ReportSection } from '../types'

vi.mock('jspdf-autotable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf-autotable')>()
  return { ...actual, default: vi.fn(actual.default) }
})

const mockedAutoTable = vi.mocked(autoTable)

beforeEach(() => {
  mockedAutoTable.mockClear()
})

describe('buildPdfDocument', () => {
  it('llama a autoTable una vez por sección, en el mismo orden, con head/body de esa sección', () => {
    const sections: ReportSection[] = [
      { title: 'Resumen', headers: ['Métrica', 'Valor'], rows: [['Tickets abiertos', 10]] },
      { title: 'Agentes', headers: ['Agente', 'Tiempo prom.'], rows: [['Ana', 21.2]] },
    ]

    buildPdfDocument(sections)

    expect(mockedAutoTable).toHaveBeenCalledTimes(2)
    expect(mockedAutoTable.mock.calls[0]?.[1]).toMatchObject({
      head: [['Métrica', 'Valor']],
      body: [['Tickets abiertos', 10]],
    })
    expect(mockedAutoTable.mock.calls[1]?.[1]).toMatchObject({
      head: [['Agente', 'Tiempo prom.']],
      body: [['Ana', 21.2]],
    })
  })

  it('encadena el startY de cada tabla a partir del finalY de la anterior', () => {
    const sections: ReportSection[] = [
      { title: 'Resumen', headers: ['Métrica', 'Valor'], rows: [['Tickets abiertos', 10]] },
      { title: 'Agentes', headers: ['Agente', 'Tiempo prom.'], rows: [['Ana', 21.2]] },
    ]

    buildPdfDocument(sections)

    const firstStartY = mockedAutoTable.mock.calls[0]?.[1]?.startY
    const secondStartY = mockedAutoTable.mock.calls[1]?.[1]?.startY

    expect(typeof firstStartY).toBe('number')
    expect(typeof secondStartY).toBe('number')
    expect(secondStartY as number).toBeGreaterThan(firstStartY as number)
  })

  it('usa orientación portrait cuando ninguna sección tiene 5 o más columnas', () => {
    const sections: ReportSection[] = [
      { title: 'Resumen', headers: ['Métrica', 'Valor'], rows: [] },
    ]

    const doc = buildPdfDocument(sections)

    const { width, height } = doc.internal.pageSize
    expect(height).toBeGreaterThan(width)
  })

  it('usa orientación landscape para todo el documento si alguna sección tiene 5 o más columnas', () => {
    const sections: ReportSection[] = [
      { title: 'Resumen', headers: ['Métrica', 'Valor'], rows: [] },
      {
        title: 'Detalle',
        headers: ['Col A', 'Col B', 'Col C', 'Col D', 'Col E'],
        rows: [],
      },
    ]

    const doc = buildPdfDocument(sections)

    const { width, height } = doc.internal.pageSize
    expect(width).toBeGreaterThan(height)
  })

  it('una sección sin filas igual genera su tabla, solo con la fila de header', () => {
    const sections: ReportSection[] = [{ title: 'Vacía', headers: ['Columna A'], rows: [] }]

    expect(() => buildPdfDocument(sections)).not.toThrow()
    expect(mockedAutoTable).toHaveBeenCalledTimes(1)
    expect(mockedAutoTable.mock.calls[0]?.[1]).toMatchObject({
      head: [['Columna A']],
      body: [],
    })
  })
})

describe('buildPdfBlob', () => {
  it('devuelve un Blob con MIME type de PDF', () => {
    const sections: ReportSection[] = [{ title: 'Resumen', headers: ['A'], rows: [] }]

    const blob = buildPdfBlob(sections)

    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })
})
