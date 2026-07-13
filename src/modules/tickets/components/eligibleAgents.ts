import type { Agent } from '../schemas'

// Mirrors the DB-enforced business rule (validate_agent_limit trigger):
// an agent can't hold more than 5 active tickets at once.
export const MAX_ACTIVE_TICKETS_PER_AGENT = 5

export function getEligibleAgents(agents: Agent[], categoryId: string): Agent[] {
  return agents.filter(
    (a) => a.categoryId === categoryId && a.activeTicketCount < MAX_ACTIVE_TICKETS_PER_AGENT
  )
}

// `>=` (not `===`) because callers vary: ReassignTicketModal's candidates
// come pre-filtered by getEligibleAgents (never reach MAX), but
// AgentDashboardPage's own agent has no such filter and can legitimately
// be sitting AT the limit, not just one slot away from it.
export function isAgentAtCapacityLimit(agent: { activeTicketCount: number } | null): boolean {
  return agent !== null && agent.activeTicketCount >= MAX_ACTIVE_TICKETS_PER_AGENT - 1
}
