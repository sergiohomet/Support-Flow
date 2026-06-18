import { useState } from 'react'
import type { TicketFilters } from '@/store/ticketsSlice'
import type { Category, Agent } from '@/modules/tickets/schemas'

interface TicketFiltersProps {
  filters: TicketFilters
  categories: Category[]
  agents: Agent[]
  onChange: (partial: Partial<TicketFilters>) => void
  onReset: () => void
  isLoading?: boolean
}

const SELECT_CLASS =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'reabierto', label: 'Reabierto' },
]

const PRIORITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

function hasActiveFilters(filters: TicketFilters): boolean {
  return (
    filters.status !== null ||
    filters.priority !== null ||
    filters.categoryId !== null ||
    filters.agentId !== null
  )
}

export function TicketFilters({
  filters,
  categories,
  agents,
  onChange,
  onReset,
  isLoading = false,
}: TicketFiltersProps): React.JSX.Element {
  // Track selected category/agent as local string for the select value
  const [localCategoryId, setLocalCategoryId] = useState(filters.categoryId ?? '')
  const [localAgentId, setLocalAgentId] = useState(filters.agentId ?? '')

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value
    onChange({ status: val === '' ? null : (val as TicketFilters['status']) })
  }

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value
    onChange({ priority: val === '' ? null : (val as TicketFilters['priority']) })
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value
    setLocalCategoryId(val)
    onChange({ categoryId: val === '' ? null : val })
  }

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value
    setLocalAgentId(val)
    onChange({ agentId: val === '' ? null : val })
  }

  const handleReset = (): void => {
    setLocalCategoryId('')
    setLocalAgentId('')
    onReset()
  }

  return (
    <div className="flex flex-wrap gap-3 items-center py-3">
      {/* Status */}
      <select
        value={filters.status ?? ''}
        onChange={handleStatusChange}
        disabled={isLoading}
        aria-label="Filtrar por estado"
        className={SELECT_CLASS}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Priority */}
      <select
        value={filters.priority ?? ''}
        onChange={handlePriorityChange}
        disabled={isLoading}
        aria-label="Filtrar por prioridad"
        className={SELECT_CLASS}
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Category */}
      <select
        value={localCategoryId}
        onChange={handleCategoryChange}
        disabled={isLoading}
        aria-label="Filtrar por categoría"
        className={SELECT_CLASS}
      >
        <option value="">Todas las categorías</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Agent — only if agents available */}
      {agents.length > 0 && (
        <select
          value={localAgentId}
          onChange={handleAgentChange}
          disabled={isLoading}
          aria-label="Filtrar por agente"
          className={SELECT_CLASS}
        >
          <option value="">Todos los agentes</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.fullName}
            </option>
          ))}
        </select>
      )}

      {/* Reset */}
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
