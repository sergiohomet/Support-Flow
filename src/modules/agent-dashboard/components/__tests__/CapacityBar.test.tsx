import { render, screen } from '@testing-library/react'
import { CapacityBar } from '../CapacityBar'

describe('CapacityBar', () => {
  it('renders the current/max count', () => {
    render(<CapacityBar current={2} max={5} />)
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
  })

  it('renders a progressbar with the correct aria attributes', () => {
    render(<CapacityBar current={2} max={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemax', '5')
  })

  it('uses a normal color when not near capacity', () => {
    render(<CapacityBar current={2} max={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.className).toContain('bg-blue-600')
  })

  it('uses a warning color when at or near capacity (current >= max - 1)', () => {
    render(<CapacityBar current={4} max={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.className).toContain('bg-amber-500')
  })

  it('uses a warning color when at full capacity', () => {
    render(<CapacityBar current={5} max={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.className).toContain('bg-amber-500')
  })
})
