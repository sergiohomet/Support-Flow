import { buildExportFilename } from '../filename'

describe('buildExportFilename', () => {
  it('arma el nombre con slug, fechas en yyyy-mm-dd y extensión', () => {
    expect(
      buildExportFilename('reportes', '2026-07-01T00:00:00.000Z', '2026-07-17T23:59:59.999Z', 'csv')
    ).toBe('reportes_2026-07-01_2026-07-17.csv')
  })

  it('trunca la fecha ISO a los primeros 10 caracteres (yyyy-mm-dd)', () => {
    const result = buildExportFilename('sla', '2026-01-05T12:34:56.000Z', '2026-01-31T12:34:56.000Z', 'xlsx')

    expect(result).toBe('sla_2026-01-05_2026-01-31.xlsx')
  })

  it('nunca incluye barras en el nombre resultante', () => {
    const result = buildExportFilename('reportes', '2026-07-01T00:00:00.000Z', '2026-07-17T23:59:59.999Z', 'pdf')

    expect(result).not.toContain('/')
  })

  it('respeta la extensión pasada (csv, xlsx o pdf)', () => {
    expect(buildExportFilename('sla', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', 'pdf')).toBe(
      'sla_2026-01-01_2026-01-02.pdf'
    )
  })
})
