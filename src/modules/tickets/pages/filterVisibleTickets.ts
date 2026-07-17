import type { TicketListItem } from '@/modules/tickets/schemas'

// Búsqueda del lado del cliente contra los tickets ya cargados para el
// filtro actual de página/estado — coincide por substring del título o por los primeros
// 8 caracteres del id (el "#xxxxxxxx" que se muestra en la UI), quitando un
// "#" inicial del término de búsqueda para que los usuarios puedan buscar con o sin él.
export function filterVisibleTickets(tickets: TicketListItem[], searchTerm: string): TicketListItem[] {
  const term = searchTerm.trim().toLowerCase()
  if (!term) return tickets

  return tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(term) ||
      t.id.slice(0, 8).toLowerCase().includes(term.replace(/^#/, ''))
  )
}
