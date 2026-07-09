import { useMemo, useState } from 'react'
import { useSlaDashboardSummary } from '@/modules/sla/hooks/useSlaDashboardSummary'
import { useSlaComplianceByCategory } from '@/modules/sla/hooks/useSlaComplianceByCategory'
import { useSlaAtRiskTickets } from '@/modules/sla/hooks/useSlaAtRiskTickets'
import { DateRangeFilter } from '@/modules/sla/components/DateRangeFilter'
import { SummaryCard } from '@/modules/sla/components/SummaryCard'
import { CategoryComplianceDonut } from '@/modules/sla/components/CategoryComplianceDonut'
import { AtRiskTicketsTable } from '@/modules/sla/components/AtRiskTicketsTable'
import { computeDateRange } from '@/modules/sla/components/dateRange'
import { Spinner } from '@/ui/Spinner'

function round(value: number): number {
  return Math.round(value)
}

export function SlaDashboardPage(): React.JSX.Element {
  const [days, setDays] = useState(7)
  // Compute the range once per `days` change — recomputing on every render
  // would produce a new millisecond-precision timestamp each time, which
  // kept re-triggering the fetch effects below in an infinite loop.
  const { dateFrom, dateTo } = useMemo(() => computeDateRange(days), [days])

  const { data: summary, isLoading: isSummaryLoading, error: summaryError } = useSlaDashboardSummary(
    dateFrom,
    dateTo
  )
  const {
    data: categoryCompliance,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useSlaComplianceByCategory(dateFrom, dateTo)
  const { data: atRiskTickets, isLoading: isAtRiskLoading, error: atRiskError } = useSlaAtRiskTickets()

  const totalTickets = summary?.totalTickets ?? 0
  const resolvedPct = totalTickets > 0 ? round((summary!.resolvedInSla / totalTickets) * 100) : 0
  const escalatedPct = totalTickets > 0 ? round((summary!.escalatedCount / totalTickets) * 100) : 0

  const error = summaryError ?? categoryError ?? atRiskError
  const isInitialLoading =
    (isSummaryLoading && !summary) || (isCategoryLoading && categoryCompliance.length === 0)

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      {/* Header */}
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
          {/* Section 1: Summary cards */}
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

          {/* Section 2: Compliance by category */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Cumplimiento por Categoría</h2>
            <div className="grid grid-cols-3 gap-5">
              {categoryCompliance.map((row) => (
                <CategoryComplianceDonut key={row.categoryId} row={row} />
              ))}
            </div>
          </div>

          {/* Section 3: At-risk tickets */}
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
