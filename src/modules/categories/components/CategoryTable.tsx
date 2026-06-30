import type { Category } from '@/modules/categories/schemas'
import { Spinner } from '@/ui/Spinner'
import { EmptyState } from '@/ui/EmptyState'

interface CategoryTableProps {
  categories: Category[]
  isFetching: boolean
  onEdit: (category: Category) => void
  onToggle: (category: Category) => void
}

export function CategoryTable({
  categories,
  isFetching,
  onEdit,
  onToggle,
}: CategoryTableProps): React.JSX.Element {
  if (isFetching && categories.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="No hay categorías"
        description="No hay categorías registradas."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Nombre
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Descripción
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              SLA
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Estado
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {categories.map((category) => (
            <tr
              key={category.id}
              className={['hover:bg-gray-50', !category.isActive ? 'opacity-50' : '']
                .filter(Boolean)
                .join(' ')}
            >
              {/* Name */}
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {category.name}
              </td>

              {/* Description */}
              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                {category.description || '—'}
              </td>

              {/* SLA */}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {category.maxResolutionHours != null ? `${category.maxResolutionHours}h` : '—'}
              </td>

              {/* Status badge */}
              <td className="px-4 py-3 whitespace-nowrap">
                {category.isActive ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Activa
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    Inactiva
                  </span>
                )}
              </td>

              {/* Actions */}
              <td className="px-4 py-3 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(category)}
                    aria-label="Edit category"
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <span className="material-icons text-base">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(category)}
                    aria-label={category.isActive ? 'Desactivar categoría' : 'Reactivar categoría'}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <span className="material-icons text-base">
                      {category.isActive ? 'toggle_on' : 'toggle_off'}
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
