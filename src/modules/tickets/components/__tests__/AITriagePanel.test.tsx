import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AiTriage } from '@/modules/tickets/schemas'
import { AITriagePanel } from '../AITriagePanel'

const mockOnAcceptCategory = vi.fn()
const mockOnAcceptPriority = vi.fn()
const mockOnUseAsResponse = vi.fn()

const baseTriage: AiTriage = {
  suggestedCategoryId: 'cat-2',
  suggestedPriority: 'alta',
  suggestedResponse: 'Hola, recibimos tu consulta sobre un problema de hardware.',
  confidence: 0.87,
  generatedAt: '2026-06-15T10:00:00Z',
}

interface RenderOptions {
  aiTriage?: AiTriage
  currentCategoryId?: string
  currentPriority?: AiTriage['suggestedPriority']
  categoryName?: string | null
  isAcceptingCategory?: boolean
  isAcceptingPriority?: boolean
}

function renderPanel(overrides: RenderOptions = {}) {
  return render(
    <AITriagePanel
      aiTriage={overrides.aiTriage ?? baseTriage}
      currentCategoryId={overrides.currentCategoryId ?? 'cat-1'}
      currentPriority={overrides.currentPriority ?? 'media'}
      categoryName={'categoryName' in overrides ? overrides.categoryName ?? null : 'Hardware'}
      onAcceptCategory={mockOnAcceptCategory}
      onAcceptPriority={mockOnAcceptPriority}
      onUseAsResponse={mockOnUseAsResponse}
      isAcceptingCategory={overrides.isAcceptingCategory ?? false}
      isAcceptingPriority={overrides.isAcceptingPriority ?? false}
    />,
  )
}

describe('AITriagePanel', () => {
  beforeEach(() => {
    mockOnAcceptCategory.mockReset()
    mockOnAcceptPriority.mockReset()
    mockOnUseAsResponse.mockReset()
  })

  it('renders the confidence badge when confidence is present', () => {
    renderPanel()
    expect(screen.getByText('87% confianza')).toBeInTheDocument()
  })

  it('omits the confidence badge when confidence is null', () => {
    renderPanel({ aiTriage: { ...baseTriage, confidence: null } })
    expect(screen.queryByText(/confianza/i)).not.toBeInTheDocument()
  })

  it('renders the resolved category name', () => {
    renderPanel({ categoryName: 'Hardware' })
    expect(screen.getByText('Hardware')).toBeInTheDocument()
  })

  it('renders a fallback when categoryName is null', () => {
    renderPanel({ categoryName: null })
    expect(screen.getByText('Categoría desconocida')).toBeInTheDocument()
  })

  it('renders the suggested priority', () => {
    renderPanel()
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('clicking "Aceptar" for category calls onAcceptCategory only', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: /aceptar categoría/i }))
    expect(mockOnAcceptCategory).toHaveBeenCalledOnce()
    expect(mockOnAcceptPriority).not.toHaveBeenCalled()
  })

  it('clicking "Aceptar" for priority calls onAcceptPriority only', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: /aceptar prioridad/i }))
    expect(mockOnAcceptPriority).toHaveBeenCalledOnce()
    expect(mockOnAcceptCategory).not.toHaveBeenCalled()
  })

  it('hides the category "Aceptar" action when the suggestion matches the current category', () => {
    renderPanel({ currentCategoryId: 'cat-2' })
    expect(screen.queryByRole('button', { name: /aceptar categoría/i })).not.toBeInTheDocument()
  })

  it('hides the priority "Aceptar" action when the suggestion matches the current priority', () => {
    renderPanel({ currentPriority: 'alta' })
    expect(screen.queryByRole('button', { name: /aceptar prioridad/i })).not.toBeInTheDocument()
  })

  it('disables only the category button while isAcceptingCategory is true', () => {
    renderPanel({ isAcceptingCategory: true })
    expect(screen.getByRole('button', { name: /aceptar categoría/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /aceptar prioridad/i })).not.toBeDisabled()
  })

  it('disables only the priority button while isAcceptingPriority is true', () => {
    renderPanel({ isAcceptingPriority: true })
    expect(screen.getByRole('button', { name: /aceptar prioridad/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /aceptar categoría/i })).not.toBeDisabled()
  })

  it('renders the suggested response text', () => {
    renderPanel()
    expect(screen.getByText(baseTriage.suggestedResponse)).toBeInTheDocument()
  })

  it('clicking "Usar como respuesta" calls onUseAsResponse', async () => {
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: /usar como respuesta/i }))
    expect(mockOnUseAsResponse).toHaveBeenCalledOnce()
  })

  it('clicking "Ignorar" hides the suggested response section', async () => {
    const user = userEvent.setup()
    renderPanel()
    expect(screen.getByText(baseTriage.suggestedResponse)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /ignorar/i }))
    expect(screen.queryByText(baseTriage.suggestedResponse)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /usar como respuesta/i })).not.toBeInTheDocument()
  })

  it('always renders the footer disclaimer', () => {
    renderPanel()
    expect(screen.getByText('Generado automáticamente. Revisá antes de enviar.')).toBeInTheDocument()
  })
})
