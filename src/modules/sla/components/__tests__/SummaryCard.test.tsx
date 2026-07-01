import { render, screen } from '@testing-library/react'
import { SummaryCard } from '../SummaryCard'

describe('SummaryCard', () => {
  it('renders label, value, and caption', () => {
    render(<SummaryCard label="Total tickets" value={142} caption="últimos 7 días" />)

    expect(screen.getByText('Total tickets')).toBeInTheDocument()
    expect(screen.getByText('142')).toBeInTheDocument()
    expect(screen.getByText('últimos 7 días')).toBeInTheDocument()
  })

  it('renders success variant with accent styling', () => {
    const { container } = render(
      <SummaryCard label="Resueltos en SLA" value={118} caption="83% del total" variant="success" />
    )

    expect(screen.getByText('83% del total')).toBeInTheDocument()
    expect(container.querySelector('.text-green-600, .text-\\[\\#16a34a\\]')).toBeTruthy()
  })

  it('renders danger variant with accent styling', () => {
    const { container } = render(
      <SummaryCard label="Escalados" value={24} caption="16.9% del total" variant="danger" />
    )

    expect(screen.getByText('16.9% del total')).toBeInTheDocument()
    expect(container.querySelector('.text-red-600, .text-red-700')).toBeTruthy()
  })

  it('renders default neutral variant when no variant is passed', () => {
    render(<SummaryCard label="Total tickets" value={142} caption="últimos 7 días" />)

    expect(screen.getByText('142')).toBeInTheDocument()
  })
})
