import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Category } from '@/modules/tickets/schemas'
import { CreateTicketForm } from '../CreateTicketForm'

const mockOnSubmit = vi.fn()

const CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Facturación', description: null },
  { id: 'cat-2', name: 'Soporte técnico', description: null },
]

function renderForm(overrides: { isLoading?: boolean; error?: string | null } = {}) {
  return render(
    <CreateTicketForm
      categories={CATEGORIES}
      onSubmit={mockOnSubmit}
      isLoading={overrides.isLoading ?? false}
      error={overrides.error ?? null}
    />,
  )
}

describe('CreateTicketForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockReset()
  })

  it('renders title, description, category select and priority select', () => {
    renderForm()

    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/prioridad/i)).toBeInTheDocument()
  })

  it('renders category options from prop', () => {
    renderForm()

    expect(screen.getByRole('option', { name: 'Facturación' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Soporte técnico' })).toBeInTheDocument()
  })

  it('calls onSubmit with correct values on valid submit', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/título/i), 'Título de prueba')
    await user.type(screen.getByLabelText(/descripción/i), 'Descripción suficientemente larga')
    await user.selectOptions(screen.getByLabelText(/categoría/i), 'cat-1')
    await user.click(screen.getByLabelText('Alta'))

    await user.click(screen.getByRole('button', { name: /crear ticket/i }))

    expect(mockOnSubmit).toHaveBeenCalledOnce()
    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Título de prueba',
      description: 'Descripción suficientemente larga',
      categoryId: 'cat-1',
      priority: 'alta',
    })
  })

  it('does not call onSubmit when title has fewer than 5 chars and shows validation error', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/título/i), 'Hi')
    await user.type(screen.getByLabelText(/descripción/i), 'Descripción suficientemente larga')
    await user.selectOptions(screen.getByLabelText(/categoría/i), 'cat-1')

    await user.click(screen.getByRole('button', { name: /crear ticket/i }))

    expect(mockOnSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByText('El título debe tener al menos 5 caracteres.'),
    ).toBeInTheDocument()
  })

  it('does not call onSubmit when description has fewer than 10 chars and shows validation error', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/título/i), 'Título válido')
    await user.type(screen.getByLabelText(/descripción/i), 'Corta')
    await user.selectOptions(screen.getByLabelText(/categoría/i), 'cat-1')

    await user.click(screen.getByRole('button', { name: /crear ticket/i }))

    expect(mockOnSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByText('La descripción debe tener al menos 10 caracteres.'),
    ).toBeInTheDocument()
  })

  it('does not call onSubmit when no category is selected and shows validation error', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/título/i), 'Título válido')
    await user.type(screen.getByLabelText(/descripción/i), 'Descripción suficientemente larga')

    await user.click(screen.getByRole('button', { name: /crear ticket/i }))

    expect(mockOnSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Seleccioná una categoría.')).toBeInTheDocument()
  })

  it('disables submit button and inputs when isLoading is true', () => {
    renderForm({ isLoading: true })

    expect(screen.getByRole('button', { name: 'Creando...' })).toBeDisabled()
    expect(screen.getByLabelText(/título/i)).toBeDisabled()
    expect(screen.getByLabelText(/descripción/i)).toBeDisabled()
  })

  it('renders error prop in an alert when provided', () => {
    renderForm({ error: 'Error al crear el ticket' })

    expect(screen.getByRole('alert')).toHaveTextContent('Error al crear el ticket')
  })

  it('does not render alert when error is null', () => {
    renderForm({ error: null })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
