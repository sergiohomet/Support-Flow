import type { TicketListItem } from '@/modules/tickets/schemas'
import { Spinner } from '@/ui/Spinner'
import { EmptyState } from '@/ui/EmptyState'
import { Pagination } from '@/ui/Pagination'
import { TicketListItem as TicketListItemComponent } from './TicketListItem'

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
      <EmptyState
        title="No hay tickets"
        description="No se encontraron tickets con los filtros aplicados."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
        {tickets.map((ticket) => (
          <TicketListItemComponent
            key={ticket.id}
            ticket={ticket}
            onClick={() => onTicketClick(ticket.id)}
          />
        ))}
      </ul>
      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  )
}
