export type ReportsRangePreset = 'last30' | 'thisMonth' | 'lastMonth' | 'thisQuarter'

// Cálculo de rango de fechas con conciencia de calendario, mantenido puro
// para que quien lo invoca (ReportsPage) pueda memoizarlo con useMemo —
// recalcularlo en cada render produciría un "now" nuevo con precisión de
// milisegundos cada vez y volvería a disparar los efectos de fetch.
// Siempre devuelve timestamps ISO completos, nunca strings de solo fecha: un
// "dateTo" de solo fecha es parseado por Postgres como medianoche UTC,
// excluyendo silenciosamente los datos del mismo día del filtro BETWEEN en
// los RPCs de reportes.
export function computeReportsDateRange(preset: ReportsRangePreset): { dateFrom: string; dateTo: string } {
  const now = new Date()

  switch (preset) {
    case 'last30': {
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
    }
    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
    }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      // El día 0 del mes actual es el último día del mes anterior.
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
    }
    case 'thisQuarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
      const from = new Date(now.getFullYear(), quarterStartMonth, 1)
      return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
    }
  }
}
