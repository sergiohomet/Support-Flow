import {
  mapReportsSummary,
  mapTicketsByCategory,
  mapTicketsByWeek,
  mapAgentPerformance,
} from '../index'

describe('mapReportsSummary', () => {
  it('maps a valid row to camelCase', () => {
    const row = {
      total_tickets: 142,
      avg_resolution_hours: 12.5,
      sla_compliance_pct: 91.2,
      escalated_count: 8,
    }

    expect(mapReportsSummary(row)).toEqual({
      totalTickets: 142,
      avgResolutionHours: 12.5,
      slaCompliancePct: 91.2,
      escalatedCount: 8,
    })
  })

  it('maps null numeric fields to null', () => {
    const row = {
      total_tickets: 0,
      avg_resolution_hours: null,
      sla_compliance_pct: null,
      escalated_count: 0,
    }

    expect(mapReportsSummary(row)).toEqual({
      totalTickets: 0,
      avgResolutionHours: null,
      slaCompliancePct: null,
      escalatedCount: 0,
    })
  })
})

describe('mapTicketsByCategory', () => {
  it('maps a valid row to camelCase', () => {
    const row = {
      category_id: 'cat-1',
      category_name: 'Hardware',
      ticket_count: 34,
    }

    expect(mapTicketsByCategory(row)).toEqual({
      categoryId: 'cat-1',
      categoryName: 'Hardware',
      ticketCount: 34,
    })
  })
})

describe('mapTicketsByWeek', () => {
  it('maps a valid row to camelCase', () => {
    const row = {
      week_start: '2026-06-22T00:00:00.000Z',
      ticket_count: 21,
    }

    expect(mapTicketsByWeek(row)).toEqual({
      weekStart: '2026-06-22T00:00:00.000Z',
      ticketCount: 21,
    })
  })
})

describe('mapAgentPerformance', () => {
  it('maps a valid row to camelCase', () => {
    const row = {
      agent_id: 'agent-1',
      agent_full_name: 'Jane Doe',
      resolved_count: 40,
      avg_working_hours: 6.4,
      sla_compliance_pct: 88.9,
    }

    expect(mapAgentPerformance(row)).toEqual({
      agentId: 'agent-1',
      agentFullName: 'Jane Doe',
      resolvedCount: 40,
      avgWorkingHours: 6.4,
      slaCompliancePct: 88.9,
    })
  })

  it('maps null numeric fields to null', () => {
    const row = {
      agent_id: 'agent-2',
      agent_full_name: 'John Smith',
      resolved_count: 0,
      avg_working_hours: null,
      sla_compliance_pct: null,
    }

    expect(mapAgentPerformance(row)).toEqual({
      agentId: 'agent-2',
      agentFullName: 'John Smith',
      resolvedCount: 0,
      avgWorkingHours: null,
      slaCompliancePct: null,
    })
  })
})
