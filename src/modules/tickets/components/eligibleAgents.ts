import type { Agent } from '../schemas'

// Replica la regla de negocio impuesta por la base de datos (trigger validate_agent_limit):
// un agente no puede tener más de 5 tickets activos a la vez.
export const MAX_ACTIVE_TICKETS_PER_AGENT = 5

export function getEligibleAgents(agents: Agent[], categoryId: string): Agent[] {
  return agents.filter(
    (a) => a.categoryId === categoryId && a.activeTicketCount < MAX_ACTIVE_TICKETS_PER_AGENT
  )
}

// Se usa `>=` (no `===`) porque quienes llaman a esto varían: los candidatos de ReassignTicketModal
// vienen prefiltrados por getEligibleAgents (nunca llegan al MAX), pero
// el propio agente de AgentDashboardPage no tiene ese filtro y legítimamente puede
// estar justo EN el límite, no solo a un lugar de distancia.
export function isAgentAtCapacityLimit(agent: { activeTicketCount: number } | null): boolean {
  return agent !== null && agent.activeTicketCount >= MAX_ACTIVE_TICKETS_PER_AGENT - 1
}
