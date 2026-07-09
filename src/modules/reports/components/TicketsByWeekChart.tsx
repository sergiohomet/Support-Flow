import type { TicketsByWeek } from '@/modules/reports/schemas'
import { EmptyState } from '@/ui/EmptyState'

interface TicketsByWeekChartProps {
  data: TicketsByWeek[]
}

function formatWeekLabel(weekStart: string): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date(weekStart))
}

export function TicketsByWeekChart({ data }: TicketsByWeekChartProps): React.JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="Sin datos" description="No hay tickets registrados en el rango seleccionado." />
  }

  const maxCount = Math.max(...data.map((row) => row.ticketCount))

  return (
    <div className="flex h-56 items-end gap-3 rounded-md border border-gray-200 bg-white p-4">
      {data.map((row) => {
        // maxCount is guaranteed > 0 whenever the array is non-empty and
        // ticketCount is never negative, but guard against an all-zero
        // dataset (maxCount === 0) to avoid a NaN height.
        const heightPct = maxCount > 0 ? Math.round((row.ticketCount / maxCount) * 100) : 0
        return (
          <div key={row.weekStart} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-medium text-gray-900">{row.ticketCount}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-sm bg-blue-600"
                style={{ height: `${heightPct}%` }}
                role="img"
                aria-label={`${row.ticketCount} tickets en la semana del ${formatWeekLabel(row.weekStart)}`}
              />
            </div>
            <span className="text-xs text-gray-500">{formatWeekLabel(row.weekStart)}</span>
          </div>
        )
      })}
    </div>
  )
}
