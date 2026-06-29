import type { TicketListItem } from '@/modules/tickets/schemas'
import { Spinner } from '@/ui/Spinner'
import { Pagination } from '@/ui/Pagination'
import { TicketCard } from './TicketCard'

interface TicketTableProps {
  tickets: TicketListItem[]
  isLoading: boolean
  totalCount: number
  currentPage: number
  pageSize: number
  onTicketClick: (id: string) => void
  onPageChange: (page: number) => void
}

export function TicketTable({
  tickets,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  onTicketClick,
  onPageChange,
}: TicketTableProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <span className="material-icons text-5xl mb-3">inbox</span>
        <p className="text-sm">No se encontraron tickets con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => onTicketClick(ticket.id)}
          />
        ))}
      </div>
      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  )
}
