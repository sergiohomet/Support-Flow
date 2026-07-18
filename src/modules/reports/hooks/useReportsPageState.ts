import { useMemo, useState } from 'react'
import { computeReportsDateRange, type ReportsRangePreset } from '@/modules/reports/components/dateRange'

export interface UseReportsPageStateResult {
  preset: ReportsRangePreset
  setPreset: (preset: ReportsRangePreset) => void
  dateFrom: string
  dateTo: string
  computeEscalatedPct: (totalTickets: number, escalatedCount: number) => number
}

function computeEscalatedPct(totalTickets: number, escalatedCount: number): number {
  return totalTickets > 0 ? Math.round((escalatedCount / totalTickets) * 100) : 0
}

// Contiene el estado de la página de reportes que no depende de un fetch: el
// preset de rango de fechas, y `computeEscalatedPct`, la única derivación que
// no viene de un RPC. Se expone como función plana en lugar de un valor
// precalculado porque necesita `totalTickets`/`escalatedCount` de
// useReportsSummary, que a su vez necesita `dateFrom`/`dateTo` de este hook —
// calcularlo acá de forma anticipada crearía una dependencia circular. La
// página llama a esta función una vez que los hooks de datos ya se
// resolvieron, de la misma forma en que ya llama a la función `refetch`
// propia de cada hook de datos.
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
    computeEscalatedPct,
  }
}
