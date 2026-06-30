import { useEffect, useRef, useState } from 'react'
import { createCategorySchema } from '@/modules/categories/schemas'

interface CategoryFormModalProps {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  initialData?: { id: string; name: string; description: string | null }
  onSubmit: (name: string, description: string | undefined) => void
  onClose: () => void
}

interface FormErrors {
  name?: string
}

export function CategoryFormModal({
  isOpen,
  isLoading,
  error,
  initialData,
  onSubmit,
  onClose,
}: CategoryFormModalProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isEditMode = initialData != null

  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  // Sync fields when initialData changes (e.g. opening edit modal with different category)
  useEffect(() => {
    setName(initialData?.name ?? '')
    setDescription(initialData?.description ?? '')
    setFieldErrors({})
  }, [initialData?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = createCategorySchema.safeParse({
      name,
      description: description.trim() === '' ? undefined : description.trim(),
    })

    if (!result.success) {
      const errors: FormErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors
        if (!errors[field]) {
          errors[field] = issue.message
        }
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    onSubmit(result.data.name, result.data.description)
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto rounded-lg p-6 shadow-xl backdrop:bg-black/40 max-w-lg w-full"
      onClose={onClose}
    >
      <h2 className="text-lg font-semibold text-gray-900">
        {isEditMode ? 'Editar categoría' : 'Nueva categoría'}
      </h2>

      {error && (
        <div role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <div>
          <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            id="cat-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="cat-description" className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            id="cat-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </div>
      </form>
    </dialog>
  )
}
