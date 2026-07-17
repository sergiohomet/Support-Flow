import { useEffect, useRef, useState } from 'react'
import type { Category } from '@/store/ticketsSlice'

type SpecialtyChangeModalProps = {
  isOpen: boolean
  user: { id: string; fullName: string; categoryId: string | null } | null
  categories: Category[]
  isLoading: boolean
  error: string | null
  onConfirm: (categoryId: string) => void
  onClose: () => void
}

export function SpecialtyChangeModal({
  isOpen,
  user,
  categories,
  isLoading,
  error,
  onConfirm,
  onClose,
}: SpecialtyChangeModalProps) {
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

  return (
    <dialog
      ref={dialogRef}
      className="m-auto rounded-lg p-6 shadow-xl backdrop:bg-black/40 max-w-md w-full"
      onClose={onClose}
    >
      <h2 className="text-lg font-semibold text-gray-900">Cambiar especialidad</h2>

      {user && (
        <p className="mt-2 text-sm text-gray-600">
          Seleccioná la nueva especialidad para {user.fullName}
        </p>
      )}

      {/* Se usa el usuario editado como key para que, al cambiar de destino, se
          remonte el estado de selección local en vez de necesitar un efecto manual de reseteo. */}
      <SpecialtyChangeFields
        key={user?.id ?? 'none'}
        user={user}
        categories={categories}
        isLoading={isLoading}
        error={error}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </dialog>
  )
}

interface SpecialtyChangeFieldsProps {
  user: { categoryId: string | null } | null
  categories: Category[]
  isLoading: boolean
  error: string | null
  onConfirm: (categoryId: string) => void
  onClose: () => void
}

function SpecialtyChangeFields({
  user,
  categories,
  isLoading,
  error,
  onConfirm,
  onClose,
}: SpecialtyChangeFieldsProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(user?.categoryId ?? '')

  return (
    <>
      <div className="mt-4">
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          disabled={isLoading}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" disabled>Seleccionar categoría...</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onConfirm(selectedCategoryId)}
          disabled={isLoading || selectedCategoryId === ''}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && (
            <span className="material-icons animate-spin text-base">refresh</span>
          )}
          Confirmar
        </button>
      </div>
    </>
  )
}
