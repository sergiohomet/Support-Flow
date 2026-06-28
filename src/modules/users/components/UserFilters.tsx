export type CombinedFilter = '' | 'all' | 'admin' | 'agent' | 'client' | 'inactive'

interface UserFiltersProps {
  search: string
  combinedFilter: CombinedFilter
  isLoading: boolean
  hasActiveFilters: boolean
  onSearchChange: (value: string) => void
  onFilterChange: (value: CombinedFilter) => void
  onReset: () => void
}

const SELECT_CLASS =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'

export function UserFilters({
  search,
  combinedFilter,
  isLoading,
  hasActiveFilters,
  onSearchChange,
  onFilterChange,
  onReset,
}: UserFiltersProps): React.JSX.Element {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(e.target.value)
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onFilterChange(e.target.value as CombinedFilter)
  }

  return (
    <div className="flex flex-wrap gap-3 items-center py-3">
      {/* Search */}
      <div className="relative flex items-center flex-1 min-w-[240px]">
        <span className="material-icons absolute left-2 text-gray-400 text-base pointer-events-none">
          search
        </span>
        <label className="sr-only" htmlFor="user-search">
          Buscar usuarios
        </label>
        <input
          id="user-search"
          type="search"
          value={search}
          onChange={handleSearchChange}
          disabled={isLoading}
          placeholder="Buscar por nombre, email o rol..."
          className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          aria-label="Buscar usuarios"
        />
      </div>

      {/* Combined filter */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Filtros:</span>
        <select
          value={combinedFilter}
          onChange={handleFilterChange}
          disabled={isLoading}
          aria-label="Filtrar usuarios"
          className={SELECT_CLASS}
        >
          <option value="" disabled>Seleccionar tipo</option>
          <option value="all">Todos los usuarios</option>
          <option value="admin">Administradores</option>
          <option value="agent">Agentes</option>
          <option value="client">Clientes</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Reset — solo visible cuando hay filtros activos */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          aria-label="Restablecer filtros"
        >
          Restablecer
        </button>
      )}
    </div>
  )
}
