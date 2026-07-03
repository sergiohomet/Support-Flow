import { useStore } from '../index'
import type { TicketListItem } from '../ticketsSlice'

const fakeTicket: TicketListItem = {
  id: 'ticket-1',
  title: 'Test ticket',
  status: 'abierto',
  priority: 'media',
  categoryId: 'cat-1',
  categoryName: 'Soporte',
  clientId: 'user-1',
  clientFullName: 'Juan Pérez',
  agentId: null,
  agentFullName: null,
  createdAt: '2026-06-15T10:00:00Z',
  updatedAt: '2026-06-15T10:00:00Z',
  commentCount: 0,
}

describe('ticketsSlice', () => {
  beforeEach(() => {
    useStore.setState({
      tickets: [],
      filters: { status: null, priority: null, categoryId: null, agentId: null, page: 1, pageSize: 10 },
      pagination: { totalCount: 0, currentPage: 1 },
      categories: [],
      agents: [],
    })
  })

  it('has correct initial state', () => {
    const state = useStore.getState()
    expect(state.tickets).toEqual([])
    expect(state.filters).toEqual({ status: null, priority: null, categoryId: null, agentId: null, page: 1, pageSize: 10 })
    expect(state.pagination).toEqual({ totalCount: 0, currentPage: 1 })
    expect(state.categories).toEqual([])
    expect(state.agents).toEqual([])
  })

  it('setTickets(mapped, totalCount) sets tickets, totalCount, and currentPage from filters.page', () => {
    useStore.setState({ filters: { status: null, priority: null, categoryId: null, agentId: null, page: 3, pageSize: 10 } })
    useStore.getState().setTickets([fakeTicket], 42)
    const state = useStore.getState()
    expect(state.tickets).toEqual([fakeTicket])
    expect(state.pagination.totalCount).toBe(42)
    expect(state.pagination.currentPage).toBe(3)
  })

  it('setFilters({ status }) updates status and resets page to 1', () => {
    useStore.setState({ filters: { status: null, priority: null, categoryId: null, agentId: null, page: 5, pageSize: 10 } })
    useStore.getState().setFilters({ status: 'abierto' })
    const { filters } = useStore.getState()
    expect(filters.status).toBe('abierto')
    expect(filters.page).toBe(1)
  })

  it('setFilters({ page }) updates page WITHOUT resetting other filters', () => {
    useStore.setState({ filters: { status: 'abierto', priority: 'alta', categoryId: null, agentId: null, page: 1, pageSize: 10 } })
    useStore.getState().setFilters({ page: 2 })
    const { filters } = useStore.getState()
    expect(filters.page).toBe(2)
    expect(filters.status).toBe('abierto')
    expect(filters.priority).toBe('alta')
  })

  it('setFilters({ priority, page }) resets page to 1 because non-page filter is present', () => {
    useStore.getState().setFilters({ priority: 'alta', page: 3 })
    const { filters } = useStore.getState()
    expect(filters.priority).toBe('alta')
    expect(filters.page).toBe(1)
  })

  it('resetFilters() restores all filters to defaults', () => {
    useStore.setState({ filters: { status: 'resuelto', priority: 'critica', categoryId: 'cat-1', agentId: 'agent-1', page: 5, pageSize: 20 } })
    useStore.getState().resetFilters()
    expect(useStore.getState().filters).toEqual({
      status: null,
      priority: null,
      categoryId: null,
      agentId: null,
      page: 1,
      pageSize: 10,
    })
  })

  it('setCategories(list) sets categories', () => {
    const list = [{ id: 'cat-1', name: 'Soporte', description: null }]
    useStore.getState().setCategories(list)
    expect(useStore.getState().categories).toEqual(list)
  })

  it('setAgents(list) sets agents', () => {
    const list = [{ id: 'agent-1', fullName: 'María García', categoryId: 'cat-1', categoryName: 'Redes', activeTicketCount: 2 }]
    useStore.getState().setAgents(list)
    expect(useStore.getState().agents).toEqual(list)
  })
})
