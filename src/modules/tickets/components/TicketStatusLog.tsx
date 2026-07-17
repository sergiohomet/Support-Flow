import type { StatusLogEntry } from '@/modules/tickets/schemas'
import { StatusBadge } from '@/ui/StatusBadge'
import { formatDateOnly } from '@/core/utils/format'

interface TicketStatusLogProps {
  statusLog: StatusLogEntry[]
}

export function TicketStatusLog({ statusLog }: TicketStatusLogProps): React.JSX.Element {
  if (statusLog.length === 0) {
    return <p className="text-sm text-gray-500">Sin historial de cambios.</p>
  }

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-base font-semibold text-gray-900 mb-2">Historial de estados</h2>
      <ul className="flex flex-col gap-3">
        {statusLog.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3">
            {/* Punto de la línea de tiempo */}
            <span className="mt-1 h-3 w-3 rounded-full bg-blue-400 border-2 border-blue-200 shrink-0" />

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">{entry.changedByFullName}</span>
                <span className="text-gray-500">cambió el estado</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {entry.fromStatus !== null ? (
                  <StatusBadge status={entry.fromStatus} />
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                    inicial
                  </span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 text-gray-400"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
                <StatusBadge status={entry.toStatus} />
              </div>
              <span className="text-xs text-gray-400">{formatDateOnly(entry.changedAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
