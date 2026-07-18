import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportsPage } from '../ReportsPage'
import { useReportsSummary } from '@/modules/reports/hooks/useReportsSummary'
import { useReportsTicketsByCategory } from '@/modules/reports/hooks/useReportsTicketsByCategory'
import { useReportsTicketsByWeek } from '@/modules/reports/hooks/useReportsTicketsByWeek'
import { useReportsAgentPerformance } from '@/modules/reports/hooks/useReportsAgentPerformance'

vi.mock('@/modules/reports/hooks/useReportsSummary', () => ({
  useReportsSummary: vi.fn(),
}))
vi.mock('@/modules/reports/hooks/useReportsTicketsByCategory', () => ({
  useReportsTicketsByCategory: vi.fn(),
}))
vi.mock('@/modules/reports/hooks/useReportsTicketsByWeek', () => ({
  useReportsTicketsByWeek: vi.fn(),
}))
vi.mock('@/modules/reports/hooks/useReportsAgentPerformance', () => ({
  useReportsAgentPerformance: vi.fn(),
}))

const mockSummaryFetch = vi.fn()
const mockCategoryFetch = vi.fn()
const mockWeekFetch = vi.fn()
const mockAgentFetch = vi.fn()

function makeSummaryReturn(overrides: Partial<ReturnType<typeof useReportsSummary>> = {}): ReturnType<typeof useReportsSummary> {
  return {
    data: { totalTickets: 4, avgResolutionHours: 12.3, slaCompliancePct: 87, escalatedCount: 1 },
    isLoading: false,
    error: null,
    refetch: mockSummaryFetch,
    ...overrides,
  }
}

function makeCategoryReturn(overrides: Partial<ReturnType<typeof useReportsTicketsByCategory>> = {}): ReturnType<typeof useReportsTicketsByCategory> {
  return {
    data: [{ categoryId: 'cat-1', categoryName: 'Hardware', ticketCount: 4 }],
    isLoading: false,
    error: null,
    refetch: mockCategoryFetch,
    ...overrides,
  }
}

function makeWeekReturn(overrides: Partial<ReturnType<typeof useReportsTicketsByWeek>> = {}): ReturnType<typeof useReportsTicketsByWeek> {
  return {
    data: [{ weekStart: '2026-06-29T00:00:00Z', ticketCount: 4 }],
    isLoading: false,
    error: null,
    refetch: mockWeekFetch,
    ...overrides,
  }
}

function makeAgentReturn(overrides: Partial<ReturnType<typeof useReportsAgentPerformance>> = {}): ReturnType<typeof useReportsAgentPerformance> {
  return {
    data: [
      { agentId: 'a-1', agentFullName: 'Sergio Hardware', resolvedCount: 1, avgWorkingHours: 0.08, slaCompliancePct: 100 },
    ],
    isLoading: false,
    error: null,
    refetch: mockAgentFetch,
    ...overrides,
  }
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useReportsSummary).mockReturnValue(makeSummaryReturn())
    vi.mocked(useReportsTicketsByCategory).mockReturnValue(makeCategoryReturn())
    vi.mocked(useReportsTicketsByWeek).mockReturnValue(makeWeekReturn())
    vi.mocked(useReportsAgentPerformance).mockReturnValue(makeAgentReturn())
  })

  it('renders the heading and all sections when data has loaded', () => {
    render(<ReportsPage />)

    expect(screen.getByText('Reportes')).toBeInTheDocument()
    expect(screen.getByText('Total tickets')).toBeInTheDocument()
    expect(screen.getByText('Tickets por Semana')).toBeInTheDocument()
    expect(screen.getByText('Tickets por Categoría')).toBeInTheDocument()
    expect(screen.getByText('Desempeño de Agentes')).toBeInTheDocument()
    expect(screen.getByText('Sergio Hardware')).toBeInTheDocument()
  })

  it('shows a spinner while the initial fetch is in flight', () => {
    vi.mocked(useReportsSummary).mockReturnValue(makeSummaryReturn({ data: null, isLoading: true }))

    render(<ReportsPage />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Desempeño de Agentes')).not.toBeInTheDocument()
  })

  it('surfaces an error from any of the four hooks', () => {
    vi.mocked(useReportsAgentPerformance).mockReturnValue(
      makeAgentReturn({ error: 'Error al procesar la solicitud. Intentá de nuevo.' })
    )

    render(<ReportsPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Error al procesar la solicitud. Intentá de nuevo.')
  })

  it('changing the date-range preset does not cause runaway re-fetching (PR #23 regression guard)', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    const callsBefore = {
      summary: vi.mocked(useReportsSummary).mock.calls.length,
      category: vi.mocked(useReportsTicketsByCategory).mock.calls.length,
    }

    await user.selectOptions(screen.getByLabelText('Rango de fechas'), 'thisMonth')

    // A single preset change should add a small, bounded number of renders —
    // not an unbounded/growing call count, which is what an unmemoized date
    // range recomputed on every render would produce (the exact bug fixed in
    // PR #23 on SlaDashboardPage).
    const callsAfter = {
      summary: vi.mocked(useReportsSummary).mock.calls.length,
      category: vi.mocked(useReportsTicketsByCategory).mock.calls.length,
    }
    expect(callsAfter.summary - callsBefore.summary).toBeLessThan(5)
    expect(callsAfter.category - callsBefore.category).toBeLessThan(5)
  })

  it('renders the export menu button', () => {
    render(<ReportsPage />)

    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument()
  })

  it('opens the export menu with CSV, Excel and PDF options wired to the loaded report data', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    await user.click(screen.getByRole('button', { name: /exportar/i }))

    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Excel' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'PDF' })).toBeInTheDocument()
  })
})
