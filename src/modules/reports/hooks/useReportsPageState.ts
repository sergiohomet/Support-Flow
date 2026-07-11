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
    agent.avgWorkingHours ?? '',
    agent.slaCompliancePct ?? '',
  ])
}

// Owns the reports page's non-fetch state: the date-range preset, and the two
// derivations (escalated %, CSV export shape) that don't come from an RPC.
// `computeEscalatedPct`/`buildCsvRows` are exposed as plain functions rather
// than pre-computed values because they need `totalTickets`/`agentPerformance`
// from the 4 data hooks (useReportsSummary, useReportsAgentPerformance, etc.),
// which in turn need `dateFrom`/`dateTo` from this hook — computing them
// eagerly here would create a circular dependency. The page calls these
// functions once the data hooks have resolved, the same way it already calls
// each data hook's own `refetch` function.
export function useReportsPageState(): UseReportsPageStateResult {
  const [preset, setPreset] = useState<ReportsRangePreset>('last30')
  // Compute the range once per `preset` change — recomputing on every render
  // would produce a new millisecond-precision timestamp each time, which
  // would re-trigger the fetch effects in the reports data hooks in an
  // infinite loop (see PR #23 regression on SlaDashboardPage).
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
