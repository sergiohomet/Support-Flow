import { buildMultiSectionCsv, escapeCsvField } from '../csv'
import type { ReportSection } from '../types'

describe('escapeCsvField', () => {
  it('returns a plain value unchanged', () => {
    expect(escapeCsvField('Ana')).toBe('Ana')
  })

  it('quotes a value containing a semicolon (the CSV delimiter)', () => {
    expect(escapeCsvField('Doe; John')).toBe('"Doe; John"')
  })

  it('escapes a value containing a double-quote by doubling it', () => {
    expect(escapeCsvField('Dijo "hola"')).toBe('"Dijo ""hola"""')
  })

  it('quotes a value containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
  })

  it('does not quote a plain string containing a comma (comma is the decimal separator, not the delimiter)', () => {
    expect(escapeCsvField('Doe, John')).toBe('Doe, John')
  })

  it('formats a decimal number using a comma decimal separator, unquoted', () => {
    expect(escapeCsvField(21.194479345763888)).toBe('21,194479345763888')
  })

  it('does not add a decimal separator to whole numbers', () => {
    expect(escapeCsvField(100)).toBe('100')
  })
})

describe('buildMultiSectionCsv', () => {
  it('emite un marcador "# {title}" seguido del header y las filas de datos para cada sección', () => {
    const sections: ReportSection[] = [
      {
        title: 'Resumen',
        headers: ['Métrica', 'Valor'],
        rows: [['Tickets abiertos', 10]],
      },
    ]

    expect(buildMultiSectionCsv(sections)).toBe(
      '# Resumen\nMétrica;Valor\nTickets abiertos;10'
    )
  })

  it('separa secciones consecutivas con una línea en blanco, sin línea en blanco final', () => {
    const sections: ReportSection[] = [
      {
        title: 'Resumen',
        headers: ['Métrica', 'Valor'],
        rows: [['Escalados', 0]],
      },
      {
        title: 'Agentes',
        headers: ['Agente', 'Tiempo prom. (horas)'],
        rows: [['Ana Martínez', 21.2]],
      },
    ]

    expect(buildMultiSectionCsv(sections)).toBe(
      '# Resumen\nMétrica;Valor\nEscalados;0\n\n# Agentes\nAgente;Tiempo prom. (horas)\nAna Martínez;21,2'
    )
  })

  it('conserva filas KPI con valor cero (no se omiten)', () => {
    const sections: ReportSection[] = [
      {
        title: 'Resumen',
        headers: ['Métrica', 'Valor'],
        rows: [['Escalados', 0]],
      },
    ]

    expect(buildMultiSectionCsv(sections)).toContain('Escalados;0')
  })

  it('una sección sin filas igual renderiza el marcador y el header, sin filas de datos', () => {
    const sections: ReportSection[] = [
      {
        title: 'Vacía',
        headers: ['Columna A', 'Columna B'],
        rows: [],
      },
    ]

    expect(buildMultiSectionCsv(sections)).toBe('# Vacía\nColumna A;Columna B')
  })

  it('escapa y delimita las filas de datos igual que escapeCsvField/;', () => {
    const sections: ReportSection[] = [
      {
        title: 'Agentes',
        headers: ['Agente', 'Nota'],
        rows: [['Doe; John', 'Dijo "hola"']],
      },
    ]

    expect(buildMultiSectionCsv(sections)).toBe(
      '# Agentes\nAgente;Nota\n"Doe; John";"Dijo ""hola"""'
    )
  })
})
