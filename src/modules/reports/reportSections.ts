import type { ReportSection } from '@/core/reportExport/types'
import type { AgentPerformance, ReportsSummary, TicketsByCategory, TicketsByWeek } from '@/modules/reports/schemas'

function round(value: number): number {
  return Math.round(value)
}

// Mismo redondeo/fallback que ya usa `ReportsPage` para las tarjetas de KPI —
// la exportación debe mostrar los mismos números que la pantalla, no
// re-derivarlos con otra lógica.
function buildKpiSection(summary: ReportsSummary | null | undefined, escalatedPct: number): ReportSection {
  return {
    title: 'Resumen',
    headers: ['Indicador', 'Valor'],
    rows: [
      ['Total tickets', summary?.totalTickets ?? 0],
      [
        'Tiempo prom. resolución (h)',
        summary?.avgResolutionHours != null ? Number(summary.avgResolutionHours.toFixed(1)) : 0,
      ],
      ['SLA cumplido (%)', summary?.slaCompliancePct != null ? round(summary.slaCompliancePct) : 0],
      ['Escalados', summary?.escalatedCount ?? 0],
      ['Escalados (%)', escalatedPct],
    ],
  }
}

function buildWeekSection(ticketsByWeek: TicketsByWeek[]): ReportSection {
  return {
    title: 'Tickets por Semana',
    headers: ['Semana', 'Cantidad de tickets'],
    rows: ticketsByWeek.map((week) => [week.weekStart, week.ticketCount]),
  }
}

// El % es del total propio de esta sección (suma de `ticketCount` de
// `ticketsByCategory`), no de `summary.totalTickets` — el RPC de categorías
// no está garantizado a sumar el mismo total que el resumen (p. ej. tickets
// sin categoría), decisión de diseño explícita, no un bug.
function buildCategorySection(ticketsByCategory: TicketsByCategory[]): ReportSection {
  const ownTotal = ticketsByCategory.reduce((sum, category) => sum + category.ticketCount, 0)

  return {
    title: 'Tickets por Categoría',
    headers: ['Categoría', 'Cantidad de tickets', '% del total'],
    rows: ticketsByCategory.map((category) => [
      category.categoryName,
      category.ticketCount,
      ownTotal > 0 ? round((category.ticketCount / ownTotal) * 100) : 0,
    ]),
  }
}

// Misma forma de fila que `buildCsvRows` en `useReportsPageState` (ahora
// removida): null -> string vacío, `avgWorkingHours` redondeado a 1 decimal.
function buildAgentSection(agentPerformance: AgentPerformance[]): ReportSection {
  return {
    title: 'Desempeño de Agentes',
    headers: ['Agente', 'Tickets resueltos', 'Tiempo prom. (horas)', 'SLA cumplido (%)'],
    rows: agentPerformance.map((agent) => [
      agent.agentFullName,
      agent.resolvedCount,
      agent.avgWorkingHours !== null ? Math.round(agent.avgWorkingHours * 10) / 10 : '',
      agent.slaCompliancePct ?? '',
    ]),
  }
}

// Arma las 4 secciones que cubren todo lo visible en `ReportsPage`: KPIs,
// tickets por semana, tickets por categoría y desempeño de agentes. Cada
// sección siempre está presente con su fila de encabezado aunque su array de
// datos esté vacío — nunca se omite una sección completa (misma regla de
// "siempre mostrar cero, nunca omitir" ya establecida para esta feature).
export function buildReportSections(
  summary: ReportsSummary | null | undefined,
  ticketsByCategory: TicketsByCategory[],
  ticketsByWeek: TicketsByWeek[],
  agentPerformance: AgentPerformance[],
  escalatedPct: number
): ReportSection[] {
  return [
    buildKpiSection(summary, escalatedPct),
    buildWeekSection(ticketsByWeek),
    buildCategorySection(ticketsByCategory),
    buildAgentSection(agentPerformance),
  ]
}
