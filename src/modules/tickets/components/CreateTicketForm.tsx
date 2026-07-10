import { useState } from 'react'
import { CreateTicketSchema } from '@/modules/tickets/schemas'
import type { Category, CreateTicketInput } from '@/modules/tickets/schemas'

interface CreateTicketFormProps {
  categories: Category[]
  onSubmit: (input: CreateTicketInput) => void
  onCancel: () => void
  isLoading: boolean
  error: string | null
}

interface FieldErrors {
  title?: string
  description?: string
  categoryId?: string
}

type Priority = 'baja' | 'media' | 'alta' | 'critica'

const PRIORITY_OPTIONS: { value: Priority; label: string; checkedClass: string }[] = [
  {
    value: 'baja',
    label: 'Baja',
    checkedClass: 'peer-checked:bg-blue-100 peer-checked:text-blue-800 peer-checked:border-blue-300',
  },
  {
    value: 'media',
    label: 'Media',
    checkedClass: 'peer-checked:bg-blue-100 peer-checked:text-blue-800 peer-checked:border-blue-300',
  },
  {
    value: 'alta',
    label: 'Alta',
    checkedClass: 'peer-checked:bg-orange-100 peer-checked:text-orange-800 peer-checked:border-orange-300',
  },
  {
    value: 'critica',
    label: 'Crítica',
    checkedClass: 'peer-checked:bg-red-100 peer-checked:text-red-800 peer-checked:border-red-300',
  },
]

const TITLE_MAX = 200

const INPUT_CLASS =
  'rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50'

export function CreateTicketForm({
  categories,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: CreateTicketFormProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priority, setPriority] = useState<Priority>('media')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()

    const result = CreateTicketSchema.safeParse({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      priority,
    })

    if (!result.success) {
      const errors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors
        if (!errors[field]) errors[field] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Título */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-baseline mb-1">
          <label htmlFor="ticket-title" className="text-sm font-medium text-gray-700">
            Título del Ticket <span className="text-red-600">*</span>
          </label>
          <span className="text-xs text-gray-400">{title.length}/{TITLE_MAX}</span>
        </div>
        <input
          id="ticket-title"
          type="text"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          disabled={isLoading}
          maxLength={TITLE_MAX}
          placeholder="Ej: Problema con acceso a VPN"
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'ticket-title-error' : undefined}
          className={[
            INPUT_CLASS,
            fieldErrors.title ? 'border-red-500' : 'border-gray-300',
          ].join(' ')}
        />
        {fieldErrors.title && (
          <p id="ticket-title-error" className="text-sm text-red-600 flex items-center gap-1">
            <span className="material-icons text-base leading-none">error</span>
            {fieldErrors.title}
          </p>
        )}
      </div>

      {/* Categoría */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-category" className="text-sm font-medium text-gray-700">
          Categoría
        </label>
        <div className="relative">
          <select
            id="ticket-category"
            value={categoryId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value)}
            disabled={isLoading}
            aria-invalid={!!fieldErrors.categoryId}
            aria-describedby={fieldErrors.categoryId ? 'ticket-category-error' : undefined}
            className={[
              INPUT_CLASS,
              'w-full appearance-none pr-8',
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
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
            <span className="material-icons text-base">expand_more</span>
          </div>
        </div>
        {fieldErrors.categoryId && (
          <p id="ticket-category-error" className="text-sm text-red-600">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      {/* Prioridad — radio pills */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Prioridad</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Prioridad">
          {PRIORITY_OPTIONS.map((opt) => (
            <label key={opt.value} className="cursor-pointer relative">
              <input
                type="radio"
                name="priority"
                value={opt.value}
                checked={priority === opt.value}
                onChange={() => setPriority(opt.value)}
                disabled={isLoading}
                className="peer sr-only"
              />
              <div
                className={[
                  'px-4 py-1.5 rounded border text-sm font-medium transition-colors',
                  'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                  'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500',
                  opt.checkedClass,
                ].join(' ')}
              >
                {opt.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Descripción Detallada */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ticket-description" className="text-sm font-medium text-gray-700">
          Descripción Detallada
        </label>
        <textarea
          id="ticket-description"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          disabled={isLoading}
          rows={5}
          placeholder="Describí el problema con el mayor detalle posible..."
          aria-invalid={!!fieldErrors.description}
          aria-describedby={fieldErrors.description ? 'ticket-description-error' : undefined}
          className={[
            INPUT_CLASS,
            'resize-y w-full',
            fieldErrors.description ? 'border-red-500' : 'border-gray-300',
          ].join(' ')}
        />
        {fieldErrors.description && (
          <p id="ticket-description-error" className="text-sm text-red-600">
            {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 rounded-md border border-gray-300 bg-transparent text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? 'Creando...' : 'Crear Ticket'}
        </button>
      </div>
    </form>
  )
}
