import { useMemo, useState } from 'react'
import { useSlaDashboardSummary } from '@/modules/sla/hooks/useSlaDashboardSummary'
import { useSlaComplianceByCategory } from '@/modules/sla/hooks/useSlaComplianceByCategory'
import { useSlaAtRiskTickets } from '@/modules/sla/hooks/useSlaAtRiskTickets'
import { DateRangeFilter } from '@/modules/sla/components/DateRangeFilter'
import { SummaryCard } from '@/modules/sla/components/SummaryCard'
import { CategoryComplianceDonut } from '@/modules/sla/components/CategoryComplianceDonut'
import { AtRiskTicketsTable } from '@/modules/sla/components/AtRiskTicketsTable'
import { computeSlaDateRange } from '@/modules/sla/components/dateRange'
import { Spinner } from '@/ui/Spinner'

export function SlaDashboardPage(): React.JSX.Element {
  const [days, setDays] = useState(7)
  // Calcula el rango una sola vez por cada cambio de `days` — recalcularlo en cada render
  // generaría un nuevo timestamp con precisión de milisegundos cada vez, lo que
  // seguía disparando los efectos de fetch de abajo en un bucle infinito.
  const { dateFrom, dateTo } = useMemo(() => computeSlaDateRange(days), [days])

  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    resolvedPct,
    escalatedPct,
  } = useSlaDashboardSummary(dateFrom, dateTo)
  const {
    data: categoryCompliance,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useSlaComplianceByCategory(dateFrom, dateTo)
  const { data: atRiskTickets, isLoading: isAtRiskLoading, error: atRiskError } = useSlaAtRiskTickets()

  const totalTickets = summary?.totalTickets ?? 0

  const error = summaryError ?? categoryError ?? atRiskError
  const isInitialLoading =
    (isSummaryLoading && !summary) || (isCategoryLoading && categoryCompliance.length === 0)

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      {/* Encabezado */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Cumplimiento de SLA</h1>
        <div className="flex items-center gap-3">
          <DateRangeFilter value={days} onChange={setDays} />
          <button
            type="button"
            disabled
            title="Exportar no disponible todavía"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed"
          >
            <span className="material-icons text-[18px]" aria-hidden="true">
              download
            </span>
            Exportar
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isInitialLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Sección 1: Tarjetas resumen */}
          <div className="grid grid-cols-3 gap-5">
            <SummaryCard label="Total tickets" value={totalTickets} caption={`últimos ${days} días`} />
            <SummaryCard
              label="Resueltos en SLA"
              value={summary?.resolvedInSla ?? 0}
              caption={`${resolvedPct}% del total`}
              variant="success"
            />
            <SummaryCard
              label="Escalados"
              value={summary?.escalatedCount ?? 0}
              caption={`${escalatedPct}% del total`}
              variant="danger"
            />
          </div>

          {/* Sección 2: Cumplimiento por categoría */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Cumplimiento por Categoría</h2>
            <div className="grid grid-cols-3 gap-5">
              {categoryCompliance.map((row) => (
                <CategoryComplianceDonut key={row.categoryId} row={row} />
              ))}
            </div>
          </div>

          {/* Sección 3: Tickets en riesgo */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Tickets en riesgo</h2>
            {isAtRiskLoading && atRiskTickets.length === 0 ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <AtRiskTicketsTable tickets={atRiskTickets} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
