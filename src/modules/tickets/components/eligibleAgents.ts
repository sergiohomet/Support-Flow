import type { Agent } from '../schemas'

// Mirrors the DB-enforced business rule (validate_agent_limit trigger):
// an agent can't hold more than 5 active tickets at once.
export const MAX_ACTIVE_TICKETS_PER_AGENT = 5

export function getEligibleAgents(agents: Agent[], categoryId: string): Agent[] {
  return agents.filter(
    (a) => a.categoryId === categoryId && a.activeTicketCount < MAX_ACTIVE_TICKETS_PER_AGENT
  )
}

export function isAgentAtCapacityLimit(agent: { activeTicketCount: number } | null): boolean {
  return agent?.activeTicketCount === MAX_ACTIVE_TICKETS_PER_AGENT - 1
}
