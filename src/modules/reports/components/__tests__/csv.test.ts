import { buildCsv, escapeCsvField } from '../csv'

describe('escapeCsvField', () => {
  it('returns a plain value unchanged', () => {
    expect(escapeCsvField('Ana')).toBe('Ana')
  })

  it('quotes a value containing a comma', () => {
    expect(escapeCsvField('Doe, John')).toBe('"Doe, John"')
  })

  it('escapes a value containing a double-quote by doubling it', () => {
    expect(escapeCsvField('Dijo "hola"')).toBe('"Dijo ""hola"""')
  })

  it('quotes a value containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
  })
})

describe('buildCsv', () => {
  it('builds the expected CSV string from headers and rows', () => {
    const headers = ['Agente', 'Tickets']
    const rows: (string | number)[][] = [
      ['Ana Martínez', 34],
      ['Doe, John', 12],
    ]

    expect(buildCsv(headers, rows)).toBe(
      'Agente,Tickets\nAna Martínez,34\n"Doe, John",12'
    )
  })
})
