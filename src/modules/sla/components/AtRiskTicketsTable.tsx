import type { AtRiskTicket } from '@/modules/sla/schemas'
import { EmptyState } from '@/ui/EmptyState'
import { formatMinutesRemaining } from './formatMinutesRemaining'
import { isTicketUrgent } from './slaThresholds'

interface AtRiskTicketsTableProps {
  tickets: AtRiskTicket[]
}

export function AtRiskTicketsTable({ tickets }: AtRiskTicketsTableProps): React.JSX.Element {
  if (tickets.length === 0) {
    return (
      <EmptyState
        title="Todo bajo control"
        description="No hay tickets en riesgo de incumplir el SLA."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Título
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Categoría
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tiempo restante
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Agente
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map((ticket) => {
            const isUrgent = isTicketUrgent(ticket.minutesRemaining)
            return (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                  #{ticket.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {ticket.title}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{ticket.categoryName}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                      isUrgent ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700',
                    ].join(' ')}
                  >
                    <span className="material-icons text-[14px]" aria-hidden="true">
                      timer
                    </span>
                    {formatMinutesRemaining(ticket.minutesRemaining)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{ticket.agentFullName}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
