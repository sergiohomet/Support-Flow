import type { TicketStatus } from '@/modules/tickets/schemas'

interface TicketFiltersProps {
  statusTab: TicketStatus | '' | null
  search: string
  isLoading: boolean
  hasActiveFilters: boolean
  onTabChange: (status: TicketStatus | '') => void
  onSearchChange: (search: string) => void
  onReset: () => void
}

const TABS: Array<{ value: TicketStatus | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'reabierto', label: 'Reabierto' },
]

export function TicketFilters({
  statusTab,
  search,
  isLoading,
  hasActiveFilters,
  onTabChange,
  onSearchChange,
  onReset,
}: TicketFiltersProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Filtrar por estado">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={statusTab === tab.value}
            disabled={isLoading}
            onClick={() => onTabChange(tab.value)}
            className={
              statusTab === tab.value
                ? 'bg-blue-600 text-white rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50'
                : 'text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200 rounded-full px-4 py-1.5 text-sm disabled:opacity-50 transition-colors'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">
            search
          </span>
          <input
            type="search"
            placeholder="Buscar ticket..."
            value={search}
            disabled={isLoading}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar ticket"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
