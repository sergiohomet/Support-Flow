import { render, screen } from '@testing-library/react'
import type { SlaComplianceByCategory } from '@/modules/sla/schemas'
import { CategoryComplianceDonut } from '../CategoryComplianceDonut'

const makeRow = (overrides: Partial<SlaComplianceByCategory> = {}): SlaComplianceByCategory => ({
  categoryId: 'cat-1',
  categoryName: 'Hardware',
  maxResolutionHours: 48,
  resolvedCount: 52,
  totalCount: 57,
  compliancePct: 91,
  ...overrides,
})

describe('CategoryComplianceDonut', () => {
  it('renders category name, percentage, max hours, and resolved counts', () => {
    render(<CategoryComplianceDonut row={makeRow()} />)

    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()
    expect(screen.getByText(/dentro de 48h/i)).toBeInTheDocument()
    expect(screen.getByText(/resueltos: 52\/57/i)).toBeInTheDocument()
  })

  it('renders green tier styling for compliancePct >= 80', () => {
    const { container } = render(<CategoryComplianceDonut row={makeRow({ compliancePct: 91 })} />)
    expect(container.querySelector('.text-\\[\\#16a34a\\]')).toBeTruthy()
  })

  it('renders amber tier styling for compliancePct between 70 and 80', () => {
    const { container } = render(<CategoryComplianceDonut row={makeRow({ compliancePct: 78 })} />)
    expect(container.querySelector('.text-\\[\\#d97706\\]')).toBeTruthy()
  })

  it('renders red tier styling for compliancePct < 70', () => {
    const { container } = render(<CategoryComplianceDonut row={makeRow({ compliancePct: 61 })} />)
    expect(container.querySelector('.text-red-600')).toBeTruthy()
  })

  it('handles null compliancePct gracefully with worst-tier styling and no crash', () => {
    const { container } = render(<CategoryComplianceDonut row={makeRow({ compliancePct: null })} />)

    expect(screen.getByText(/sin datos/i)).toBeInTheDocument()
    expect(container.querySelector('.text-red-600')).toBeTruthy()
  })
})
