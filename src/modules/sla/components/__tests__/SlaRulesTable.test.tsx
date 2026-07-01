import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SlaConfigRow } from '@/modules/sla/schemas'
import { SlaRulesTable } from '../SlaRulesTable'

const makeRow = (overrides: Partial<SlaConfigRow> = {}): SlaConfigRow => ({
  categoryId: 'cat-1',
  categoryName: 'Hardware',
  maxResolutionHours: 48,
  escalationEnabled: true,
  updatedAt: '2026-01-01T09:41:00Z',
  ...overrides,
})

const defaultProps = {
  rows: [makeRow()],
  onSaveAll: vi.fn(),
  isSaving: false,
}

function renderTable(overrides: Partial<typeof defaultProps> = {}) {
  return render(<SlaRulesTable {...defaultProps} {...overrides} />)
}

describe('SlaRulesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a row per category with name, hours, escalation toggle, and formatted updatedAt', () => {
    renderTable()

    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByDisplayValue('48')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
    // formatDate renders dd/mm/yyyy, hh:mm — raw ISO string must not appear as-is
    expect(screen.queryByText('2026-01-01T09:41:00Z')).not.toBeInTheDocument()
  })

  it('shows EmptyState when rows array is empty', () => {
    renderTable({ rows: [] })

    expect(screen.getAllByText(/no hay reglas/i)[0]).toBeInTheDocument()
  })

  it('the single footer "Guardar cambios" button is disabled until a row is edited', () => {
    renderTable()

    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled()
  })

  it('calls onSaveAll with only the changed row when one row is edited', async () => {
    const user = userEvent.setup()
    const onSaveAll = vi.fn()
    renderTable({ onSaveAll })

    const hoursInput = screen.getByDisplayValue('48')
    await user.clear(hoursInput)
    await user.type(hoursInput, '72')

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i })
    expect(saveButton).not.toBeDisabled()
    await user.click(saveButton)

    expect(onSaveAll).toHaveBeenCalledWith([
      { categoryId: 'cat-1', maxResolutionHours: 72, escalationEnabled: true },
    ])
  })

  it('calls onSaveAll with changes from multiple edited rows in one click', async () => {
    const user = userEvent.setup()
    const onSaveAll = vi.fn()
    renderTable({
      rows: [makeRow(), makeRow({ categoryId: 'cat-2', categoryName: 'Software', maxResolutionHours: 24 })],
      onSaveAll,
    })

    const hoursInput = screen.getByDisplayValue('48')
    await user.clear(hoursInput)
    await user.type(hoursInput, '72')

    await user.click(screen.getByRole('checkbox', { name: /software/i }))

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(onSaveAll).toHaveBeenCalledWith([
      { categoryId: 'cat-1', maxResolutionHours: 72, escalationEnabled: true },
      { categoryId: 'cat-2', maxResolutionHours: 24, escalationEnabled: false },
    ])
  })

  it('does not call onSaveAll and shows inline error when an edited row is out of range (>999)', async () => {
    const user = userEvent.setup()
    const onSaveAll = vi.fn()
    renderTable({ onSaveAll })

    const hoursInput = screen.getByDisplayValue('48')
    await user.clear(hoursInput)
    await user.type(hoursInput, '1000')

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(onSaveAll).not.toHaveBeenCalled()
    expect(screen.getByText('Las horas máximas deben estar entre 1 y 999')).toBeInTheDocument()
  })

  it('does not call onSaveAll and shows inline error when an edited row is out of range (<1)', async () => {
    const user = userEvent.setup()
    const onSaveAll = vi.fn()
    renderTable({ onSaveAll })

    const hoursInput = screen.getByDisplayValue('48')
    await user.clear(hoursInput)
    await user.type(hoursInput, '0')

    await user.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(onSaveAll).not.toHaveBeenCalled()
    expect(screen.getByText('Las horas máximas deben estar entre 1 y 999')).toBeInTheDocument()
  })

  it('disables the footer button when isSaving=true even if a row was edited', async () => {
    const user = userEvent.setup()
    const { rerender } = renderTable()

    const hoursInput = screen.getByDisplayValue('48')
    await user.clear(hoursInput)
    await user.type(hoursInput, '72')

    rerender(<SlaRulesTable {...defaultProps} isSaving={true} />)

    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled()
  })
})
