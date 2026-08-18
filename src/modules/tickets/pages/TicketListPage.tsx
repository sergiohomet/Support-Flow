import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useDebounce } from '@/core/hooks/useDebounce'
import { useTicketList } from '@/modules/tickets/hooks/useTicketList'
import { TicketTable } from '@/modules/tickets/components/TicketTable'
import { TicketFilters } from '@/modules/tickets/components/TicketFilters'
import { filterVisibleTickets } from './filterVisibleTickets'
import type { TicketStatus } from '@/modules/tickets/schemas'

export function TicketListPage(): React.JSX.Element {
  const navigate = useNavigate()

  const tickets = useStore((s) => s.tickets)
  const filters = useStore((s) => s.filters)
  const pagination = useStore((s) => s.pagination)
  const setFilters = useStore((s) => s.setFilters)
  const resetFilters = useStore((s) => s.resetFilters)
  const user = useStore((s) => s.user)

  const [statusTab, setStatusTab] = useState<TicketStatus | '' | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // ── Assigned mode (existing behavior) ──────────────────────────────────
  const hasActiveFilters =
    statusTab !== null || debouncedSearch.trim() !== ''

  const handleSearchChange = (value: string): void => {
    setSearch(value)
  }

  const handleTabChange = (status: TicketStatus | ''): void => {
    setStatusTab(status)
    setFilters({ status: status === '' ? null : status })
  }

  const handleReset = (): void => {
    setStatusTab(null)
    setSearch('')
    resetFilters()
  }

  const handlePageChange = (page: number): void => {
    setFilters({ page })
  }

  const { isFetching } = useTicketList(hasActiveFilters)

  const visibleTickets = filterVisibleTickets(tickets, debouncedSearch)

  const handleTicketClick = (id: string): void => {
    navigate('/tickets/' + id)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
        {user?.role === 'client' && (
          <button
            onClick={() => navigate('/tickets/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nuevo ticket
          </button>
        )}
      </div>

      <TicketFilters
        statusTab={statusTab}
        search={search}
        isLoading={isFetching}
        hasActiveFilters={hasActiveFilters}
        onTabChange={handleTabChange}
        onSearchChange={handleSearchChange}
        onReset={handleReset}
      />

      {!hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="material-icons text-5xl mb-3">confirmation_number</span>
          <p className="text-sm">Seleccioná un estado o buscá para ver tickets.</p>
        </div>
      ) : (
        <TicketTable
          tickets={visibleTickets}
          isLoading={isFetching}
          totalCount={pagination.totalCount}
          currentPage={pagination.currentPage}
          pageSize={filters.pageSize}
          onTicketClick={handleTicketClick}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}
