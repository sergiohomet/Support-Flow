import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationFilterPills } from '../NotificationFilterPills'

describe('NotificationFilterPills', () => {
  it('renders exactly 6 pills with the expected labels', () => {
    render(<NotificationFilterPills active="all" onChange={vi.fn()} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)

    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No leídas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambios de estado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Escalamientos SLA' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reasignaciones' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comentarios nuevos' })).toBeInTheDocument()
  })

  it('marks the active pill distinguishably from inactive ones', () => {
    render(<NotificationFilterPills active="unread" onChange={vi.fn()} />)

    const activeButton = screen.getByRole('button', { name: 'No leídas' })
    const inactiveButton = screen.getByRole('button', { name: 'Todas' })

    expect(activeButton).toHaveAttribute('aria-pressed', 'true')
    expect(inactiveButton).toHaveAttribute('aria-pressed', 'false')
    expect(activeButton.className).not.toBe(inactiveButton.className)
  })

  it('calls onChange with the correct filter value when a pill is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NotificationFilterPills active="all" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Escalamientos SLA' }))

    expect(onChange).toHaveBeenCalledWith('sla_escalation')
  })

  it('calls onChange with "reassignment" when the Reasignaciones pill is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NotificationFilterPills active="all" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Reasignaciones' }))

    expect(onChange).toHaveBeenCalledWith('reassignment')
  })
})
