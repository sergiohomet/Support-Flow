import { useState } from 'react'
import { useListCategories } from '@/modules/categories/hooks/useListCategories'
import { useCreateCategory } from '@/modules/categories/hooks/useCreateCategory'
import { useUpdateCategory } from '@/modules/categories/hooks/useUpdateCategory'
import { useToggleCategoryStatus } from '@/modules/categories/hooks/useToggleCategoryStatus'
import { CategoryTable } from '@/modules/categories/components/CategoryTable'
import { CategoryFormModal } from '@/modules/categories/components/CategoryFormModal'
import { ToggleCategoryModal } from '@/modules/categories/components/ToggleCategoryModal'
import type { Category } from '@/modules/categories/schemas'

type ModalMode = 'create' | 'edit' | 'toggle' | null

export function CategoriesPage(): React.JSX.Element {
  const { categories, isFetching, error, refetch } = useListCategories()
  const { execute: createCategory, isLoading: isCreating, error: createError } = useCreateCategory()
  const { execute: updateCategory, isLoading: isUpdating, error: updateError } = useUpdateCategory()
  const { execute: toggleStatus, isLoading: isToggling } = useToggleCategoryStatus()

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  // ---------------------------------------------------------------------------
  // Manejadores
  // ---------------------------------------------------------------------------

  const handleCreate = async (name: string, description: string | undefined): Promise<void> => {
    const ok = await createCategory(name, description)
    if (ok) {
      setModalMode(null)
      void refetch()
    }
  }

  const handleEdit = async (name: string, description: string | undefined): Promise<void> => {
    if (!selectedCategory) return
    const ok = await updateCategory(selectedCategory.id, name, description)
    if (ok) {
      setModalMode(null)
      setSelectedCategory(null)
      void refetch()
    }
  }

  const handleToggleConfirm = async (): Promise<void> => {
    if (!selectedCategory) return
    const ok = await toggleStatus(selectedCategory.id)
    if (ok) {
      setModalMode(null)
      setSelectedCategory(null)
      void refetch()
    }
  }

  const handleOpenEdit = (category: Category): void => {
    setSelectedCategory(category)
    setModalMode('edit')
  }

  const handleOpenToggle = (category: Category): void => {
    setSelectedCategory(category)
    setModalMode('toggle')
  }

  const handleCloseModal = (): void => {
    setModalMode(null)
    setSelectedCategory(null)
  }

  // ---------------------------------------------------------------------------
  // Estado derivado
  // ---------------------------------------------------------------------------

  const isFormModalOpen = modalMode === 'create' || modalMode === 'edit'
  const formInitialData =
    modalMode === 'edit' && selectedCategory
      ? {
          id: selectedCategory.id,
          name: selectedCategory.name,
          description: selectedCategory.description,
        }
      : undefined
  const formIsLoading = modalMode === 'create' ? isCreating : isUpdating
  const formError = modalMode === 'create' ? createError : updateError

  // ---------------------------------------------------------------------------
  // Renderizado
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Categorías</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administrá las categorías de soporte disponibles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalMode('create')}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <span className="material-icons text-base">add</span>
          Nueva Categoría
        </button>
      </div>

      {/* Banner de error */}
      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <CategoryTable
        categories={categories}
        isFetching={isFetching}
        onEdit={handleOpenEdit}
        onToggle={handleOpenToggle}
      />

      {/* Modal de formulario (crear + editar) */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        isLoading={formIsLoading}
        error={formError}
        initialData={formInitialData}
        onSubmit={modalMode === 'create' ? handleCreate : handleEdit}
        onClose={handleCloseModal}
      />

      {/* Modal de confirmación para alternar estado */}
      <ToggleCategoryModal
        isOpen={modalMode === 'toggle'}
        isLoading={isToggling}
        category={selectedCategory}
        onConfirm={handleToggleConfirm}
        onClose={handleCloseModal}
      />
    </div>
  )
}
