import { render, screen } from '@testing-library/react'
import { SlaInfoBanner } from '../SlaInfoBanner'

describe('SlaInfoBanner', () => {
  it('renders the "Información Importante" heading', () => {
    render(<SlaInfoBanner />)

    expect(screen.getByText('Información Importante')).toBeInTheDocument()
  })

  it('renders the escalation explanation copy', () => {
    render(<SlaInfoBanner />)

    expect(
      screen.getByText(
        'Cuando un ticket supera el tiempo límite su prioridad escala automáticamente a Crítica y se notifica a todos los administradores.'
      )
    ).toBeInTheDocument()
  })
})
