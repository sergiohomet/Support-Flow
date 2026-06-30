import { useEffect, useRef } from 'react'
import type { Category } from '@/modules/categories/schemas'

interface ToggleCategoryModalProps {
  isOpen: boolean
  isLoading: boolean
  category: Category | null
  onConfirm: () => void
  onClose: () => void
}

export function ToggleCategoryModal({
  isOpen,
  isLoading,
  category,
  onConfirm,
  onClose,
}: ToggleCategoryModalProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  if (!category) return <></>

  const isDeactivating = category.isActive

  return (
    <dialog
      ref={dialogRef}
      className="m-auto rounded-lg p-6 shadow-xl backdrop:bg-black/40 max-w-md w-full"
      onClose={onClose}
    >
      <h2 className="text-lg font-semibold text-gray-900">
        {isDeactivating
          ? `¿Desactivar "${category.name}"?`
          : `¿Activar "${category.name}"?`}
      </h2>

      {isDeactivating ? (
        <p className="mt-2 text-sm text-gray-600">
          Los tickets existentes mantienen esta categoría. No se podrán reabrir tickets con esta categoría deshabilitada.
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-600">
          La categoría volverá a estar disponible para nuevos tickets.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={[
            'rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed',
            isDeactivating
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700',
          ].join(' ')}
        >
          {isDeactivating ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </dialog>
  )
}
