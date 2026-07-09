import type { TicketsByCategory } from '@/modules/reports/schemas'
import { EmptyState } from '@/ui/EmptyState'

interface TicketsByCategoryBreakdownProps {
  data: TicketsByCategory[]
}

export function TicketsByCategoryBreakdown({ data }: TicketsByCategoryBreakdownProps): React.JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="Sin datos" description="No hay tickets registrados en el rango seleccionado." />
  }

  const maxCount = Math.max(...data.map((row) => row.ticketCount))

  return (
    <div className="flex flex-col gap-4 rounded-md border border-gray-200 bg-white p-4">
      {data.map((row) => {
        const widthPct = maxCount > 0 ? Math.round((row.ticketCount / maxCount) * 100) : 0
        return (
          <div key={row.categoryId}>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-gray-900">{row.categoryName}</span>
              <span className="text-gray-500">{row.ticketCount}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full bg-blue-600"
                style={{ width: `${widthPct}%` }}
                role="img"
                aria-label={`${row.ticketCount} tickets en ${row.categoryName}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
