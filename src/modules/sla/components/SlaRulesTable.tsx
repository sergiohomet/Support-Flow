import type { SlaConfigRow } from '@/modules/sla/schemas'
import { EmptyState } from '@/ui/EmptyState'
import { formatDate } from '@/core/utils/format'
import { useSlaRulesForm } from './useSlaRulesForm'
import type { SlaConfigChange } from './useSlaRulesForm'

export type { SlaConfigChange } from './useSlaRulesForm'

interface SlaRulesTableProps {
  rows: SlaConfigRow[]
  onSaveAll: (changes: SlaConfigChange[]) => void
  isSaving: boolean
}

export function SlaRulesTable({ rows, onSaveAll, isSaving }: SlaRulesTableProps): React.JSX.Element {
  const { getRowState, rowErrors, hasDirtyRows, handleHoursChange, handleToggleChange, handleSaveAll } =
    useSlaRulesForm(rows, onSaveAll)

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No hay reglas de SLA"
        description="No hay reglas de SLA configuradas."
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
              Categoría
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Horas Máximas
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Escalamiento Automático
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Último modificado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const state = getRowState(row)
            const rowError = rowErrors[row.categoryId]

            return (
              <tr key={row.categoryId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.categoryName}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={state.maxResolutionHours}
                      onChange={(e) => handleHoursChange(row.categoryId, e.target.value)}
                      aria-label={`Horas máximas para ${row.categoryName}`}
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-gray-500">h</span>
                  </div>
                  {rowError && <p className="mt-1 text-xs text-red-600">{rowError}</p>}
                </td>

                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={state.escalationEnabled}
                    onChange={(e) => handleToggleChange(row.categoryId, e.target.checked)}
                    aria-label={`Escalamiento automático para ${row.categoryName}`}
                    className="h-4 w-4"
                  />
                </td>

                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(row.updatedAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-4 py-3">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving || !hasDirtyRows}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  )
}
