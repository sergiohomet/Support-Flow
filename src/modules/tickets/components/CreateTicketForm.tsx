import { useState } from 'react'
import type { Category, CreateTicketInput } from '@/modules/tickets/schemas'

interface CreateTicketFormProps {
  categories: Category[]
  onSubmit: (input: CreateTicketInput) => void
  isLoading: boolean
  error: string | null
}

interface FieldErrors {
  title?: string
  description?: string
  categoryId?: string
}

const PRIORITY_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
] as const

const INPUT_CLASS =
  'rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50'

export function CreateTicketForm({
  categories,
  onSubmit,
  isLoading,
  error,
}: CreateTicketFormProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'critica'>('media')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}

    if (!title.trim()) {
      errors.title = 'El título es requerido.'
    } else if (title.trim().length < 5) {
      errors.title = 'El título debe tener al menos 5 caracteres.'
    } else if (title.trim().length > 120) {
      errors.title = 'El título no puede superar los 120 caracteres.'
    }

    if (!description.trim()) {
      errors.description = 'La descripción es requerida.'
    } else if (description.trim().length < 10) {
      errors.description = 'La descripción debe tener al menos 10 caracteres.'
    }

    if (!categoryId) {
      errors.categoryId = 'Seleccioná una categoría.'
    }

    return errors
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) return

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      priority,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-title" className="text-sm font-medium text-gray-700">
          Título
        </label>
        <input
          id="ticket-title"
          type="text"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          disabled={isLoading}
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'ticket-title-error' : undefined}
          className={[
            INPUT_CLASS,
            fieldErrors.title ? 'border-red-500' : 'border-gray-300',
          ].join(' ')}
        />
        {fieldErrors.title && (
          <p id="ticket-title-error" className="text-sm text-red-600">
            {fieldErrors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-description" className="text-sm font-medium text-gray-700">
          Descripción
        </label>
        <textarea
          id="ticket-description"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          disabled={isLoading}
          rows={4}
          aria-invalid={!!fieldErrors.description}
          aria-describedby={fieldErrors.description ? 'ticket-description-error' : undefined}
          className={[
            INPUT_CLASS,
            'resize-none',
            fieldErrors.description ? 'border-red-500' : 'border-gray-300',
          ].join(' ')}
        />
        {fieldErrors.description && (
          <p id="ticket-description-error" className="text-sm text-red-600">
            {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-category" className="text-sm font-medium text-gray-700">
          Categoría
        </label>
        <select
          id="ticket-category"
          value={categoryId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value)}
          disabled={isLoading}
          aria-invalid={!!fieldErrors.categoryId}
          aria-describedby={fieldErrors.categoryId ? 'ticket-category-error' : undefined}
          className={[
            INPUT_CLASS,
            fieldErrors.categoryId ? 'border-red-500' : 'border-gray-300',
          ].join(' ')}
        >
          <option value="">Seleccioná una categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <p id="ticket-category-error" className="text-sm text-red-600">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-priority" className="text-sm font-medium text-gray-700">
          Prioridad
        </label>
        <select
          id="ticket-priority"
          value={priority}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setPriority(e.target.value as typeof priority)
          }
          disabled={isLoading}
          className={[INPUT_CLASS, 'border-gray-300'].join(' ')}
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creando...' : 'Crear ticket'}
      </button>
    </form>
  )
}
