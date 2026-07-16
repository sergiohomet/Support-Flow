import type { TicketListItem } from '@/modules/tickets/schemas'

// Client-side search match against the tickets already loaded for the
// current page/status filter — matches on title substring or on the first
// 8 characters of the id (the "#xxxxxxxx" shown in the UI), stripping a
// leading "#" from the search term so users can search with or without it.
export function filterVisibleTickets(tickets: TicketListItem[], searchTerm: string): TicketListItem[] {
  const term = searchTerm.trim().toLowerCase()
  if (!term) return tickets

  return tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(term) ||
      t.id.slice(0, 8).toLowerCase().includes(term.replace(/^#/, ''))
  )
}
