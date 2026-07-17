// Cálculo del rango de fechas basado en días, mantenido puro para que quien lo invoca (SlaDashboardPage)
// pueda memoizarlo con useMemo — recalcularlo en cada render generaría un
// nuevo "now" con precisión de milisegundos cada vez y volvería a disparar los efectos de fetch.
// Siempre devuelve timestamps ISO completos, nunca strings de solo fecha: un
// "dateTo" de solo fecha es interpretado por Postgres como medianoche UTC, excluyendo
// silenciosamente los datos del mismo día del filtro BETWEEN en las RPCs de SLA.
export function computeSlaDateRange(days: number): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - days)
  return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
}
