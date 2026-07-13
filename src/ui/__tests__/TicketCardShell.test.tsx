import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TicketCardShell } from '../TicketCardShell'

describe('TicketCardShell', () => {
  it('renders id, title, and description', () => {
    render(<TicketCardShell id="abcdef12-0000-0000-0000-000000000000" title="Título" description="Detalle" />)
    expect(screen.getByText('#abcdef12')).toBeInTheDocument()
    expect(screen.getByText('Título')).toBeInTheDocument()
    expect(screen.getByText('Detalle')).toBeInTheDocument()
  })

  it('renders as a plain (non-interactive) div when no onClick is given', () => {
    render(<TicketCardShell id="abcdef12-0000-0000-0000-000000000000" title="Título" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders as a role="button" and shows the "Ver detalle" hint when onClick is given', () => {
    render(<TicketCardShell id="abcdef12-0000-0000-0000-000000000000" title="Título" onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText(/ver detalle/i)).toBeInTheDocument()
  })

  it('calls onClick when the card is clicked', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<TicketCardShell id="abcdef12-0000-0000-0000-000000000000" title="Título" onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('calls onClick when Enter is pressed on the focused card', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<TicketCardShell id="abcdef12-0000-0000-0000-000000000000" title="Título" onClick={onClick} />)
    screen.getByRole('button').focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('calls onClick when Space is pressed on the focused card', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<TicketCardShell id="abcdef12-0000-0000-0000-000000000000" title="Título" onClick={onClick} />)
    screen.getByRole('button').focus()
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not double-trigger the card onClick when a nested action button (with its own stopPropagation) is activated via keyboard', async () => {
    // Mirrors real usage (AssignedTicketCard/AvailableTicketCard): the nested
    // button stops CLICK propagation itself. Pressing Enter on a focused
    // <button> makes the browser synthesize a click on it (native behavior),
    // which the button's own handler stops — but the separate keydown event
    // still bubbles to the shell's div regardless, which is exactly what the
    // shell's `event.target !== event.currentTarget` guard exists to ignore.
    const onClick = vi.fn()
    const onAction = vi.fn((event: React.MouseEvent) => event.stopPropagation())
    const user = userEvent.setup()
    render(
      <TicketCardShell id="abcdef12-0000-0000-0000-000000000000" title="Título" onClick={onClick}>
        <button type="button" onClick={onAction}>
          Acción
        </button>
      </TicketCardShell>
    )
    screen.getByRole('button', { name: 'Acción' }).focus()
    await user.keyboard('{Enter}')
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders children (actions) and badges/meta/footer', () => {
    render(
      <TicketCardShell
        id="abcdef12-0000-0000-0000-000000000000"
        title="Título"
        badges={<span>Badge</span>}
        meta={<span>Meta</span>}
        footer={<span>Footer</span>}
      >
        <button type="button">Acción</button>
      </TicketCardShell>
    )
    expect(screen.getByText('Badge')).toBeInTheDocument()
    expect(screen.getByText('Meta')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument()
  })
})
