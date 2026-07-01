import { useState } from 'react'
import type { SlaConfigRow } from '@/modules/sla/schemas'
import { updateSlaConfigSchema } from '@/modules/sla/schemas'
import { EmptyState } from '@/ui/EmptyState'
import { formatDate } from '@/core/utils/format'

export interface SlaConfigChange {
  categoryId: string
  maxResolutionHours: number
  escalationEnabled: boolean
}

interface SlaRulesTableProps {
  rows: SlaConfigRow[]
  onSaveAll: (changes: SlaConfigChange[]) => void
  isSaving: boolean
}

interface RowState {
  maxResolutionHours: string
  escalationEnabled: boolean
}

type RowErrors = Record<string, string | undefined>

export function SlaRulesTable({ rows, onSaveAll, isSaving }: SlaRulesTableProps): React.JSX.Element {
  const [rowState, setRowState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.categoryId,
        { maxResolutionHours: String(row.maxResolutionHours), escalationEnabled: row.escalationEnabled },
      ])
    )
  )
  const [rowErrors, setRowErrors] = useState<RowErrors>({})

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No hay reglas de SLA"
        description="No hay reglas de SLA configuradas."
      />
    )
  }

  const getState = (row: SlaConfigRow): RowState =>
    rowState[row.categoryId] ?? {
      maxResolutionHours: String(row.maxResolutionHours),
      escalationEnabled: row.escalationEnabled,
    }

  const handleHoursChange = (categoryId: string, value: string): void => {
    setRowState((prev) => ({
      ...prev,
      [categoryId]: { ...getStateFor(prev, categoryId), maxResolutionHours: value },
    }))
  }

  const handleToggleChange = (categoryId: string, checked: boolean): void => {
    setRowState((prev) => ({
      ...prev,
      [categoryId]: { ...getStateFor(prev, categoryId), escalationEnabled: checked },
    }))
  }

  const getStateFor = (state: Record<string, RowState>, categoryId: string): RowState => {
    const row = rows.find((r) => r.categoryId === categoryId)
    return (
      state[categoryId] ?? {
        maxResolutionHours: String(row?.maxResolutionHours ?? ''),
        escalationEnabled: row?.escalationEnabled ?? false,
      }
    )
  }

  const isDirty = (row: SlaConfigRow): boolean => {
    const state = getState(row)
    return (
      state.maxResolutionHours !== String(row.maxResolutionHours) ||
      state.escalationEnabled !== row.escalationEnabled
    )
  }

  const handleSaveAll = (): void => {
    const dirtyRows = rows.filter(isDirty)
    if (dirtyRows.length === 0) return

    const nextErrors: RowErrors = {}
    const changes: SlaConfigChange[] = []

    for (const row of dirtyRows) {
      const state = getState(row)
      const result = updateSlaConfigSchema.safeParse({
        maxResolutionHours: Number(state.maxResolutionHours),
        escalationEnabled: state.escalationEnabled,
      })

      if (!result.success) {
        nextErrors[row.categoryId] = result.error.issues[0]?.message ?? 'Valor inválido'
        continue
      }

      changes.push({
        categoryId: row.categoryId,
        maxResolutionHours: result.data.maxResolutionHours,
        escalationEnabled: result.data.escalationEnabled,
      })
    }

    setRowErrors(nextErrors)

    // All-or-nothing: if any dirty row is invalid, save nothing until it's fixed.
    if (Object.keys(nextErrors).length > 0) return

    onSaveAll(changes)
  }

  const hasDirtyRows = rows.some(isDirty)

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
            const state = getState(row)
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
