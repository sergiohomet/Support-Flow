import type { AgentPerformance } from '@/modules/reports/schemas'
import { EmptyState } from '@/ui/EmptyState'

interface AgentPerformanceTableProps {
  data: AgentPerformance[]
}

function formatHours(hours: number | null): string {
  if (hours === null) return 'Sin datos'
  return `${hours.toFixed(1)}h`
}

function formatPercent(pct: number | null): string {
  if (pct === null) return 'Sin datos'
  return `${Math.round(pct)}%`
}

export function AgentPerformanceTable({ data }: AgentPerformanceTableProps): React.JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="Sin datos" description="No hay desempeño de agentes en el rango seleccionado." />
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Agente
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tickets resueltos
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tiempo prom.
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SLA cumplido
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((agent) => (
            <tr key={agent.agentId} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {agent.agentFullName}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{agent.resolvedCount}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatHours(agent.avgWorkingHours)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatPercent(agent.slaCompliancePct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
