import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlaDashboardPage } from '../SlaDashboardPage'
import { useSlaDashboardSummary } from '@/modules/sla/hooks/useSlaDashboardSummary'
import { useSlaComplianceByCategory } from '@/modules/sla/hooks/useSlaComplianceByCategory'
import { useSlaAtRiskTickets } from '@/modules/sla/hooks/useSlaAtRiskTickets'

vi.mock('@/modules/sla/hooks/useSlaDashboardSummary', () => ({
  useSlaDashboardSummary: vi.fn(),
}))
vi.mock('@/modules/sla/hooks/useSlaComplianceByCategory', () => ({
  useSlaComplianceByCategory: vi.fn(),
}))
vi.mock('@/modules/sla/hooks/useSlaAtRiskTickets', () => ({
  useSlaAtRiskTickets: vi.fn(),
}))

const mockSummaryFetch = vi.fn()
const mockCategoryFetch = vi.fn()
const mockAtRiskFetch = vi.fn()

function makeSummaryReturn(
  overrides: Partial<ReturnType<typeof useSlaDashboardSummary>> = {}
): ReturnType<typeof useSlaDashboardSummary> {
  return {
    data: { totalTickets: 42, resolvedInSla: 30, escalatedCount: 5 },
    isLoading: false,
    error: null,
    refetch: mockSummaryFetch,
    resolvedPct: 71,
    escalatedPct: 12,
    ...overrides,
  }
}

function makeCategoryReturn(
  overrides: Partial<ReturnType<typeof useSlaComplianceByCategory>> = {}
): ReturnType<typeof useSlaComplianceByCategory> {
  return {
    data: [
      {
        categoryId: 'c1',
        categoryName: 'Hardware',
        maxResolutionHours: 24,
        resolvedCount: 8,
        totalCount: 10,
        compliancePct: 80,
      },
    ],
    isLoading: false,
    error: null,
    refetch: mockCategoryFetch,
    ...overrides,
  }
}

function makeAtRiskReturn(
  overrides: Partial<ReturnType<typeof useSlaAtRiskTickets>> = {}
): ReturnType<typeof useSlaAtRiskTickets> {
  return {
    data: [
      {
        id: '1234567890abcdef',
        title: 'Servidor caído',
        categoryName: 'Infraestructura',
        agentFullName: 'Sergio Hardware',
        minutesRemaining: 90,
      },
    ],
    isLoading: false,
    error: null,
    refetch: mockAtRiskFetch,
    ...overrides,
  }
}

describe('SlaDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSlaDashboardSummary).mockReturnValue(makeSummaryReturn())
    vi.mocked(useSlaComplianceByCategory).mockReturnValue(makeCategoryReturn())
    vi.mocked(useSlaAtRiskTickets).mockReturnValue(makeAtRiskReturn())
  })

  it('renders the heading and all sections when data has loaded', () => {
    render(<SlaDashboardPage />)

    expect(screen.getByText('Cumplimiento de SLA')).toBeInTheDocument()
    expect(screen.getByText('Total tickets')).toBeInTheDocument()
    expect(screen.getByText('Cumplimiento por Categoría')).toBeInTheDocument()
    expect(screen.getByText('Tickets en riesgo')).toBeInTheDocument()
  })

  it('renders an enabled export menu button instead of the disabled placeholder', () => {
    render(<SlaDashboardPage />)

    const exportButton = screen.getByRole('button', { name: /exportar/i })
    expect(exportButton).toBeInTheDocument()
    expect(exportButton).not.toBeDisabled()
    expect(exportButton).not.toHaveAttribute('title', 'Exportar no disponible todavía')
    expect(screen.queryByTitle('Exportar no disponible todavía')).not.toBeInTheDocument()
  })

  it('opens the export menu with CSV, Excel and PDF options wired to the loaded SLA data', async () => {
    const user = userEvent.setup()
    render(<SlaDashboardPage />)

    await user.click(screen.getByRole('button', { name: /exportar/i }))

    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Excel' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'PDF' })).toBeInTheDocument()
  })

  it('shows a spinner while the initial fetch is in flight', () => {
    vi.mocked(useSlaDashboardSummary).mockReturnValue(makeSummaryReturn({ data: null, isLoading: true }))

    render(<SlaDashboardPage />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Tickets en riesgo')).not.toBeInTheDocument()
  })

  it('surfaces an error from any of the three hooks', () => {
    vi.mocked(useSlaAtRiskTickets).mockReturnValue(
      makeAtRiskReturn({ error: 'Error al procesar la solicitud. Intentá de nuevo.' })
    )

    render(<SlaDashboardPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Error al procesar la solicitud. Intentá de nuevo.')
  })
})
