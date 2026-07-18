import { buildSlaSections } from '../slaSections'
import type { AtRiskTicket, SlaComplianceByCategory, SlaDashboardSummary } from '@/modules/sla/schemas'

const fullSummary: SlaDashboardSummary = {
  totalTickets: 42,
  resolvedInSla: 30,
  escalatedCount: 5,
}

describe('buildSlaSections', () => {
  it('returns exactly 3 sections in a fixed order', () => {
    const sections = buildSlaSections(fullSummary, [], [], 71, 12, 7)

    expect(sections).toHaveLength(3)
    expect(sections.map((section) => section.title)).toEqual([
      'Resumen',
      'Cumplimiento por Categoría',
      'Tickets en riesgo',
    ])
  })

  describe('KPI section', () => {
    it('builds the indicator/value rows from the summary and the given resolvedPct/escalatedPct, embedding days in the Total tickets label', () => {
      const [kpiSection] = buildSlaSections(fullSummary, [], [], 71, 12, 7)

      expect(kpiSection.headers).toEqual(['Indicador', 'Valor'])
      expect(kpiSection.rows).toEqual([
        ['Total tickets (últimos 7 días)', 42],
        ['Resueltos en SLA', 30],
        ['Resueltos en SLA (%)', 71],
        ['Escalados', 5],
        ['Escalados (%)', 12],
      ])
    })

    it('falls back to 0 for every KPI count when summary is undefined', () => {
      const [kpiSection] = buildSlaSections(undefined, [], [], 0, 0, 30)

      expect(kpiSection.rows).toEqual([
        ['Total tickets (últimos 30 días)', 0],
        ['Resueltos en SLA', 0],
        ['Resueltos en SLA (%)', 0],
        ['Escalados', 0],
        ['Escalados (%)', 0],
      ])
    })

    it('falls back to 0 for every KPI count when summary is null (the shape useSlaDashboardSummary returns before it loads)', () => {
      const [kpiSection] = buildSlaSections(null, [], [], 0, 0, 14)

      expect(kpiSection.rows).toEqual([
        ['Total tickets (últimos 14 días)', 0],
        ['Resueltos en SLA', 0],
        ['Resueltos en SLA (%)', 0],
        ['Escalados', 0],
        ['Escalados (%)', 0],
      ])
    })
  })

  describe('Cumplimiento por Categoría section', () => {
    it('maps one row per category, rounding compliancePct when present', () => {
      const categoryCompliance: SlaComplianceByCategory[] = [
        {
          categoryId: 'c1',
          categoryName: 'Hardware',
          maxResolutionHours: 24,
          resolvedCount: 8,
          totalCount: 10,
          compliancePct: 79.6,
        },
      ]

      const [, categorySection] = buildSlaSections(fullSummary, categoryCompliance, [], 71, 12, 7)

      expect(categorySection.headers).toEqual([
        'Categoría',
        'Cumplimiento (%)',
        'Máximo (h)',
        'Resueltos',
        'Total',
      ])
      expect(categorySection.rows).toEqual([['Hardware', 80, 24, 8, 10]])
    })

    it('uses the "Sin datos" string fallback when compliancePct is null, matching the on-screen donut', () => {
      const categoryCompliance: SlaComplianceByCategory[] = [
        {
          categoryId: 'c2',
          categoryName: 'Software',
          maxResolutionHours: 48,
          resolvedCount: 0,
          totalCount: 0,
          compliancePct: null,
        },
      ]

      const [, categorySection] = buildSlaSections(fullSummary, categoryCompliance, [], 71, 12, 7)

      expect(categorySection.rows).toEqual([['Software', 'Sin datos', 48, 0, 0]])
    })

    it('still includes the header row when there is no category data', () => {
      const [, categorySection] = buildSlaSections(fullSummary, [], [], 71, 12, 7)

      expect(categorySection.rows).toEqual([])
    })
  })

  describe('Tickets en riesgo section', () => {
    it('maps one row per at-risk ticket using the truncated ID and the formatted remaining time', () => {
      const atRiskTickets: AtRiskTicket[] = [
        {
          id: '1234567890abcdef',
          title: 'Servidor caído',
          categoryName: 'Infraestructura',
          agentFullName: 'Sergio Hardware',
          minutesRemaining: 90,
        },
        {
          id: 'abcdef1234567890',
          title: 'Ticket vencido',
          categoryName: 'Redes',
          agentFullName: 'Ana Soporte',
          minutesRemaining: -5,
        },
      ]

      const [, , atRiskSection] = buildSlaSections(fullSummary, [], atRiskTickets, 71, 12, 7)

      expect(atRiskSection.headers).toEqual(['ID', 'Título', 'Categoría', 'Tiempo restante', 'Agente'])
      expect(atRiskSection.rows).toEqual([
        ['#12345678', 'Servidor caído', 'Infraestructura', '1h 30m', 'Sergio Hardware'],
        ['#abcdef12', 'Ticket vencido', 'Redes', 'Vencido', 'Ana Soporte'],
      ])
    })

    it('still includes the header row when there are no at-risk tickets', () => {
      const [, , atRiskSection] = buildSlaSections(fullSummary, [], [], 71, 12, 7)

      expect(atRiskSection.rows).toEqual([])
    })
  })
})
