import { render, screen } from '@testing-library/react'
import type { AgentPerformance } from '@/modules/reports/schemas'
import { AgentPerformanceTable } from '../AgentPerformanceTable'

const makeAgent = (overrides: Partial<AgentPerformance> = {}): AgentPerformance => ({
  agentId: 'agent-1',
  agentFullName: 'Ana Martínez',
  resolvedCount: 34,
  avgWorkingHours: 12.5,
  slaCompliancePct: 98,
  ...overrides,
})

describe('AgentPerformanceTable', () => {
  it('renders all columns correctly', () => {
    render(<AgentPerformanceTable data={[makeAgent()]} />)

    expect(screen.getByText('Ana Martínez')).toBeInTheDocument()
    expect(screen.getByText('34')).toBeInTheDocument()
    expect(screen.getByText('12.5h')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
  })

  it('renders "Sin datos" when avgWorkingHours is null', () => {
    render(<AgentPerformanceTable data={[makeAgent({ avgWorkingHours: null })]} />)

    expect(screen.getByText('Sin datos')).toBeInTheDocument()
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })

  it('renders "Sin datos" when slaCompliancePct is null', () => {
    render(<AgentPerformanceTable data={[makeAgent({ slaCompliancePct: null })]} />)

    expect(screen.getByText('Sin datos')).toBeInTheDocument()
    expect(screen.queryByText(/nan%/i)).not.toBeInTheDocument()
  })

  it('shows an empty state when data is empty', () => {
    render(<AgentPerformanceTable data={[]} />)

    expect(screen.getByText(/sin datos/i)).toBeInTheDocument()
  })
})
