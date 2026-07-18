import type { ReportSection } from '@/core/reportExport/types'
import type { AtRiskTicket, SlaComplianceByCategory, SlaDashboardSummary } from '@/modules/sla/schemas'
import { formatMinutesRemaining } from '@/modules/sla/components/formatMinutesRemaining'

function round(value: number): number {
  return Math.round(value)
}

// Mismo redondeo/fallback que ya usa `SlaDashboardPage` para las tarjetas de
// resumen — la exportación debe mostrar los mismos números que la pantalla,
// no re-derivarlos con otra lógica. El rótulo de "Total tickets" incorpora
// `days`, igual que la leyenda "últimos N días" que muestra la tarjeta en
// pantalla, decisión de diseño explícita.
function buildKpiSection(
  summary: SlaDashboardSummary | null | undefined,
  resolvedPct: number,
  escalatedPct: number,
  days: number
): ReportSection {
  return {
    title: 'Resumen',
    headers: ['Indicador', 'Valor'],
    rows: [
      [`Total tickets (últimos ${days} días)`, summary?.totalTickets ?? 0],
      ['Resueltos en SLA', summary?.resolvedInSla ?? 0],
      ['Resueltos en SLA (%)', resolvedPct],
      ['Escalados', summary?.escalatedCount ?? 0],
      ['Escalados (%)', escalatedPct],
    ],
  }
}

// Mismo fallback "Sin datos" que `CategoryComplianceDonut` cuando
// `compliancePct` es null — la exportación no debe mostrar un 0% engañoso
// donde en pantalla se ve "Sin datos".
function buildCategorySection(categoryCompliance: SlaComplianceByCategory[]): ReportSection {
  return {
    title: 'Cumplimiento por Categoría',
    headers: ['Categoría', 'Cumplimiento (%)', 'Máximo (h)', 'Resueltos', 'Total'],
    rows: categoryCompliance.map((category) => [
      category.categoryName,
      category.compliancePct !== null ? round(category.compliancePct) : 'Sin datos',
      category.maxResolutionHours,
      category.resolvedCount,
      category.totalCount,
    ]),
  }
}

// Mismo ID truncado (`#${id.slice(0, 8)}`) y mismo texto formateado de tiempo
// restante que usa `AtRiskTicketsTable` — se exporta lo que se ve en
// pantalla, no el minuto crudo.
function buildAtRiskSection(atRiskTickets: AtRiskTicket[]): ReportSection {
  return {
    title: 'Tickets en riesgo',
    headers: ['ID', 'Título', 'Categoría', 'Tiempo restante', 'Agente'],
    rows: atRiskTickets.map((ticket) => [
      `#${ticket.id.slice(0, 8)}`,
      ticket.title,
      ticket.categoryName,
      formatMinutesRemaining(ticket.minutesRemaining),
      ticket.agentFullName,
    ]),
  }
}

// Arma las 3 secciones que cubren todo lo visible en `SlaDashboardPage`:
// resumen, cumplimiento por categoría y tickets en riesgo. Cada sección
// siempre está presente con su fila de encabezado aunque su array de datos
// esté vacío — nunca se omite una sección completa (misma regla ya
// establecida para `buildReportSections`).
export function buildSlaSections(
  summary: SlaDashboardSummary | null | undefined,
  categoryCompliance: SlaComplianceByCategory[],
  atRiskTickets: AtRiskTicket[],
  resolvedPct: number,
  escalatedPct: number,
  days: number
): ReportSection[] {
  return [
    buildKpiSection(summary, resolvedPct, escalatedPct, days),
    buildCategorySection(categoryCompliance),
    buildAtRiskSection(atRiskTickets),
  ]
}
