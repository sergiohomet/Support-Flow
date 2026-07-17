import { useReportsSummary } from '@/modules/reports/hooks/useReportsSummary'
import { useReportsTicketsByCategory } from '@/modules/reports/hooks/useReportsTicketsByCategory'
import { useReportsTicketsByWeek } from '@/modules/reports/hooks/useReportsTicketsByWeek'
import { useReportsAgentPerformance } from '@/modules/reports/hooks/useReportsAgentPerformance'
import { useReportsPageState } from '@/modules/reports/hooks/useReportsPageState'
import { ReportsDateRangeFilter } from '@/modules/reports/components/ReportsDateRangeFilter'
import { TicketsByWeekChart } from '@/modules/reports/components/TicketsByWeekChart'
import { TicketsByCategoryBreakdown } from '@/modules/reports/components/TicketsByCategoryBreakdown'
import { AgentPerformanceTable } from '@/modules/reports/components/AgentPerformanceTable'
import { ExportCsvButton } from '@/modules/reports/components/ExportCsvButton'
import { SummaryCard } from '@/modules/sla/components/SummaryCard'
import { Spinner } from '@/ui/Spinner'

function round(value: number): number {
  return Math.round(value)
}

export function ReportsPage(): React.JSX.Element {
  const { preset, setPreset, dateFrom, dateTo, csvHeaders, computeEscalatedPct, buildCsvRows } =
    useReportsPageState()

  const { data: summary, isLoading: isSummaryLoading, error: summaryError } = useReportsSummary(
    dateFrom,
    dateTo
  )
  const {
    data: ticketsByCategory,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useReportsTicketsByCategory(dateFrom, dateTo)
  const {
    data: ticketsByWeek,
    isLoading: isWeekLoading,
    error: weekError,
  } = useReportsTicketsByWeek(dateFrom, dateTo)
  const {
    data: agentPerformance,
    isLoading: isAgentLoading,
    error: agentError,
  } = useReportsAgentPerformance(dateFrom, dateTo)

  const totalTickets = summary?.totalTickets ?? 0
  const escalatedCount = summary?.escalatedCount ?? 0
  const escalatedPct = computeEscalatedPct(totalTickets, escalatedCount)

  const error = summaryError ?? categoryError ?? weekError ?? agentError
  const isInitialLoading =
    (isSummaryLoading && !summary) ||
    (isCategoryLoading && ticketsByCategory.length === 0) ||
    (isWeekLoading && ticketsByWeek.length === 0) ||
    (isAgentLoading && agentPerformance.length === 0)

  const csvRows = buildCsvRows(agentPerformance)

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      {/* Encabezado */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
        <div className="flex items-center gap-3">
          <ReportsDateRangeFilter value={preset} onChange={setPreset} />
          <ExportCsvButton
            filename="desempeno-agentes-reportes.csv"
            headers={csvHeaders}
            rows={csvRows}
          />
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
          <div className="grid grid-cols-4 gap-5">
            <SummaryCard label="Total tickets" value={totalTickets} caption="en el rango seleccionado" />
            <SummaryCard
              label="Tiempo prom. resolución (h)"
              value={summary?.avgResolutionHours != null ? Number(summary.avgResolutionHours.toFixed(1)) : 0}
              caption={summary?.avgResolutionHours != null ? 'tiempo promedio' : 'Sin datos disponibles'}
            />
            <SummaryCard
              label="SLA cumplido (%)"
              value={summary?.slaCompliancePct != null ? round(summary.slaCompliancePct) : 0}
              caption={summary?.slaCompliancePct != null ? 'del total' : 'Sin datos disponibles'}
              variant="success"
            />
            <SummaryCard
              label="Escalados"
              value={escalatedCount}
              caption={`${escalatedPct}% del total`}
              variant="danger"
            />
          </div>

          {/* Sección 2: Tickets por semana / por categoría */}
          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Tickets por Semana</h2>
              <TicketsByWeekChart data={ticketsByWeek} />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Tickets por Categoría</h2>
              <TicketsByCategoryBreakdown data={ticketsByCategory} />
            </div>
          </div>

          {/* Sección 3: Desempeño de agentes */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Desempeño de Agentes</h2>
            <AgentPerformanceTable data={agentPerformance} />
          </div>
        </div>
      )}
    </div>
  )
}
