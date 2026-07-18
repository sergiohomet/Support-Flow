import { buildReportSections } from '../reportSections'
import type { AgentPerformance, ReportsSummary, TicketsByCategory, TicketsByWeek } from '@/modules/reports/schemas'

const fullSummary: ReportsSummary = {
  totalTickets: 42,
  avgResolutionHours: 12.34,
  slaCompliancePct: 87.6,
  escalatedCount: 3,
}

describe('buildReportSections', () => {
  it('returns exactly 4 sections in a fixed order', () => {
    const sections = buildReportSections(fullSummary, [], [], [], 7)

    expect(sections).toHaveLength(4)
    expect(sections.map((section) => section.title)).toEqual([
      'Resumen',
      'Tickets por Semana',
      'Tickets por Categoría',
      'Desempeño de Agentes',
    ])
  })

  describe('KPI section', () => {
    it('builds the indicator/value rows from the summary and the given escalatedPct', () => {
      const [kpiSection] = buildReportSections(fullSummary, [], [], [], 7)

      expect(kpiSection.headers).toEqual(['Indicador', 'Valor'])
      expect(kpiSection.rows).toEqual([
        ['Total tickets', 42],
        ['Tiempo prom. resolución (h)', 12.3],
        ['SLA cumplido (%)', 88],
        ['Escalados', 3],
        ['Escalados (%)', 7],
      ])
    })

    it('falls back to 0 for every KPI when summary is undefined', () => {
      const [kpiSection] = buildReportSections(undefined, [], [], [], 0)

      expect(kpiSection.rows).toEqual([
        ['Total tickets', 0],
        ['Tiempo prom. resolución (h)', 0],
        ['SLA cumplido (%)', 0],
        ['Escalados', 0],
        ['Escalados (%)', 0],
      ])
    })

    it('falls back to 0 for every KPI when summary is null (the shape useReportsSummary returns before it loads)', () => {
      const [kpiSection] = buildReportSections(null, [], [], [], 0)

      expect(kpiSection.rows).toEqual([
        ['Total tickets', 0],
        ['Tiempo prom. resolución (h)', 0],
        ['SLA cumplido (%)', 0],
        ['Escalados', 0],
        ['Escalados (%)', 0],
      ])
    })

    it('falls back to 0 for avgResolutionHours/slaCompliancePct when they are null, keeping the rest of the summary', () => {
      const summary: ReportsSummary = {
        totalTickets: 10,
        avgResolutionHours: null,
        slaCompliancePct: null,
        escalatedCount: 2,
      }

      const [kpiSection] = buildReportSections(summary, [], [], [], 20)

      expect(kpiSection.rows).toEqual([
        ['Total tickets', 10],
        ['Tiempo prom. resolución (h)', 0],
        ['SLA cumplido (%)', 0],
        ['Escalados', 2],
        ['Escalados (%)', 20],
      ])
    })
  })

  describe('Tickets por Semana section', () => {
    it('maps one row per week entry, formatting weekStart as dd/mm/yyyy like the on-screen chart', () => {
      const ticketsByWeek: TicketsByWeek[] = [
        { weekStart: '2026-06-29T12:00:00Z', ticketCount: 4 },
        { weekStart: '2026-07-06T12:00:00Z', ticketCount: 9 },
      ]

      const [, weekSection] = buildReportSections(fullSummary, [], ticketsByWeek, [], 0)

      expect(weekSection.headers).toEqual(['Semana', 'Cantidad de tickets'])
      expect(weekSection.rows).toEqual([
        ['29/06/2026', 4],
        ['06/07/2026', 9],
      ])
    })

    it('still includes the header row when there is no week data', () => {
      const [, weekSection] = buildReportSections(fullSummary, [], [], [], 0)

      expect(weekSection.headers).toEqual(['Semana', 'Cantidad de tickets'])
      expect(weekSection.rows).toEqual([])
    })
  })

  describe('Tickets por Categoría section', () => {
    it('computes the percentage of the section own total, not the summary total', () => {
      const ticketsByCategory: TicketsByCategory[] = [
        { categoryId: 'c1', categoryName: 'Hardware', ticketCount: 6 },
        { categoryId: 'c2', categoryName: 'Software', ticketCount: 3 },
      ]

      const [, , categorySection] = buildReportSections(fullSummary, ticketsByCategory, [], [], 0)

      expect(categorySection.headers).toEqual(['Categoría', 'Cantidad de tickets', '% del total'])
      expect(categorySection.rows).toEqual([
        ['Hardware', 6, 67],
        ['Software', 3, 33],
      ])
    })

    it('uses 0% for every row instead of NaN when the section own total is 0', () => {
      const ticketsByCategory: TicketsByCategory[] = [
        { categoryId: 'c1', categoryName: 'Hardware', ticketCount: 0 },
      ]

      const [, , categorySection] = buildReportSections(fullSummary, ticketsByCategory, [], [], 0)

      expect(categorySection.rows).toEqual([['Hardware', 0, 0]])
    })

    it('still includes the header row when there is no category data', () => {
      const [, , categorySection] = buildReportSections(fullSummary, [], [], [], 0)

      expect(categorySection.rows).toEqual([])
    })
  })

  describe('Desempeño de Agentes section', () => {
    it('shapes rows the same way the on-screen table does, rounding avgWorkingHours to 1 decimal', () => {
      const agentPerformance: AgentPerformance[] = [
        {
          agentId: 'a-1',
          agentFullName: 'Sergio Hardware',
          resolvedCount: 12,
          avgWorkingHours: 3.44,
          slaCompliancePct: 88,
        },
        {
          agentId: 'a-2',
          agentFullName: 'Ana Soporte',
          resolvedCount: 5,
          avgWorkingHours: null,
          slaCompliancePct: null,
        },
      ]

      const [, , , agentSection] = buildReportSections(fullSummary, [], [], agentPerformance, 0)

      expect(agentSection.headers).toEqual([
        'Agente',
        'Tickets resueltos',
        'Tiempo prom. (horas)',
        'SLA cumplido (%)',
      ])
      expect(agentSection.rows).toEqual([
        ['Sergio Hardware', 12, 3.4, 88],
        ['Ana Soporte', 5, 'Sin datos', 'Sin datos'],
      ])
    })

    it('still includes the header row when there is no agent data', () => {
      const [, , , agentSection] = buildReportSections(fullSummary, [], [], [], 0)

      expect(agentSection.rows).toEqual([])
    })
  })
})
