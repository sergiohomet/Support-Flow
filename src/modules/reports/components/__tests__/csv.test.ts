import { buildCsv, escapeCsvField } from '../csv'

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

describe('buildCsv', () => {
  it('builds the expected CSV string using semicolons as the delimiter and commas for decimals', () => {
    const headers = ['Agente', 'Tiempo prom. (horas)']
    const rows: (string | number)[][] = [
      ['Ana Martínez', 21.2],
      ['Doe; John', 3],
    ]

    expect(buildCsv(headers, rows)).toBe(
      'Agente;Tiempo prom. (horas)\nAna Martínez;21,2\n"Doe; John";3'
    )
  })
})
