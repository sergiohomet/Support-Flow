import { useMemo, useState } from 'react'
import { computeReportsDateRange, type ReportsRangePreset } from '@/modules/reports/components/dateRange'
import type { AgentPerformance } from '@/modules/reports/schemas'

const CSV_HEADERS = ['Agente', 'Tickets resueltos', 'Tiempo prom. (horas)', 'SLA cumplido (%)']

export interface UseReportsPageStateResult {
  preset: ReportsRangePreset
  setPreset: (preset: ReportsRangePreset) => void
  dateFrom: string
  dateTo: string
  csvHeaders: string[]
  computeEscalatedPct: (totalTickets: number, escalatedCount: number) => number
  buildCsvRows: (agentPerformance: AgentPerformance[]) => (string | number)[][]
}

function computeEscalatedPct(totalTickets: number, escalatedCount: number): number {
  return totalTickets > 0 ? Math.round((escalatedCount / totalTickets) * 100) : 0
}

function buildCsvRows(agentPerformance: AgentPerformance[]): (string | number)[][] {
  return agentPerformance.map((agent) => [
    agent.agentFullName,
    agent.resolvedCount,
    agent.avgWorkingHours !== null ? Math.round(agent.avgWorkingHours * 10) / 10 : '',
    agent.slaCompliancePct ?? '',
  ])
}

// Contiene el estado de la página de reportes que no depende de un fetch: el
// preset de rango de fechas, y las dos derivaciones (% escalado, forma de
// exportación CSV) que no vienen de un RPC. `computeEscalatedPct`/
// `buildCsvRows` se exponen como funciones planas en lugar de valores
// precalculados porque necesitan `totalTickets`/`agentPerformance` de los 4
// hooks de datos (useReportsSummary, useReportsAgentPerformance, etc.), que a
// su vez necesitan `dateFrom`/`dateTo` de este hook — calcularlos acá de
// forma anticipada crearía una dependencia circular. La página llama a estas
// funciones una vez que los hooks de datos ya se resolvieron, de la misma
// forma en que ya llama a la función `refetch` propia de cada hook de datos.
export function useReportsPageState(): UseReportsPageStateResult {
  const [preset, setPreset] = useState<ReportsRangePreset>('last30')
  // Calcula el rango una sola vez por cada cambio de `preset` — recalcularlo
  // en cada render produciría un timestamp nuevo con precisión de
  // milisegundos cada vez, lo que volvería a disparar los efectos de fetch
  // en los hooks de datos de reportes en un loop infinito (ver la regresión
  // del PR #23 en SlaDashboardPage).
  const { dateFrom, dateTo } = useMemo(() => computeReportsDateRange(preset), [preset])

  return {
    preset,
    setPreset,
    dateFrom,
    dateTo,
    csvHeaders: CSV_HEADERS,
    computeEscalatedPct,
    buildCsvRows,
  }
}
