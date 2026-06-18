import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useTicketList } from '@/modules/tickets/hooks/useTicketList'
import { TicketTable } from '@/modules/tickets/components/TicketTable'
import { TicketFilters } from '@/modules/tickets/components/TicketFilters'

export function TicketListPage(): React.ReactElement {
  const navigate = useNavigate()
  const { isFetching, isLoadingCategories, isLoadingAgents, fetch, loadCategories, loadAgents } = useTicketList()

  const tickets = useStore((s) => s.tickets)
  const filters = useStore((s) => s.filters)
  const pagination = useStore((s) => s.pagination)
  const categories = useStore((s) => s.categories)
  const agents = useStore((s) => s.agents)
  const setFilters = useStore((s) => s.setFilters)
  const resetFilters = useStore((s) => s.resetFilters)
  const user = useStore((s) => s.user)

  const isFirstRender = useRef(true)

  useEffect(() => {
    void loadCategories()
    void loadAgents()
    void fetch()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    void fetch()
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTicketClick = (id: string): void => {
    navigate('/tickets/' + id)
  }

  const handlePageChange = (page: number): void => {
    setFilters({ page })
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
        filters={filters}
        categories={categories}
        agents={agents}
        onChange={(partial) => setFilters(partial)}
        onReset={resetFilters}
        isLoading={isLoadingCategories || isLoadingAgents}
      />
      <TicketTable
        tickets={tickets}
        isLoading={isFetching}
        totalCount={pagination.totalCount}
        currentPage={pagination.currentPage}
        pageSize={filters.pageSize}
        onTicketClick={handleTicketClick}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
