import { getEligibleAgents, isAgentAtCapacityLimit, MAX_ACTIVE_TICKETS_PER_AGENT } from '../eligibleAgents'
import type { Agent } from '@/modules/tickets/schemas'

const makeAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'agent-1',
  fullName: 'Ana García',
  categoryId: 'cat-1',
  categoryName: 'Redes',
  activeTicketCount: 0,
  ...overrides,
})

describe('getEligibleAgents', () => {
  it('only returns agents matching the ticket category', () => {
    const agents = [
      makeAgent({ id: 'a1', categoryId: 'cat-1' }),
      makeAgent({ id: 'a2', categoryId: 'cat-2' }),
    ]
    expect(getEligibleAgents(agents, 'cat-1').map((a) => a.id)).toEqual(['a1'])
  })

  it('excludes agents already at the max active-ticket limit', () => {
    const agents = [
      makeAgent({ id: 'a1', categoryId: 'cat-1', activeTicketCount: MAX_ACTIVE_TICKETS_PER_AGENT }),
      makeAgent({ id: 'a2', categoryId: 'cat-1', activeTicketCount: MAX_ACTIVE_TICKETS_PER_AGENT - 1 }),
    ]
    expect(getEligibleAgents(agents, 'cat-1').map((a) => a.id)).toEqual(['a2'])
  })

  it('returns an empty array when no agents match', () => {
    expect(getEligibleAgents([], 'cat-1')).toEqual([])
  })
})

describe('isAgentAtCapacityLimit', () => {
  it('returns true when the agent has exactly one slot left (about to hit the limit)', () => {
    expect(isAgentAtCapacityLimit(makeAgent({ activeTicketCount: MAX_ACTIVE_TICKETS_PER_AGENT - 1 }))).toBe(true)
  })

  it('returns false when the agent has more than one slot free', () => {
    expect(isAgentAtCapacityLimit(makeAgent({ activeTicketCount: 0 }))).toBe(false)
  })

  it('returns false when agent is null (no selection yet)', () => {
    expect(isAgentAtCapacityLimit(null)).toBe(false)
  })
})
