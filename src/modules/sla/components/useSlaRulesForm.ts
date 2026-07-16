import { useState } from 'react'
import type { SlaConfigRow } from '@/modules/sla/schemas'
import { updateSlaConfigSchema } from '@/modules/sla/schemas'
import { parseWithFirstError } from '@/core/hooks/useValidatedSubmit'

export interface SlaConfigChange {
  categoryId: string
  maxResolutionHours: number
  escalationEnabled: boolean
}

export interface RowState {
  maxResolutionHours: string
  escalationEnabled: boolean
}

export type RowErrors = Record<string, string | undefined>

export interface UseSlaRulesFormResult {
  getRowState: (row: SlaConfigRow) => RowState
  rowErrors: RowErrors
  isDirty: (row: SlaConfigRow) => boolean
  hasDirtyRows: boolean
  handleHoursChange: (categoryId: string, value: string) => void
  handleToggleChange: (categoryId: string, checked: boolean) => void
  handleSaveAll: () => void
}

// Owns the dirty-row diffing, per-row schema validation, and all-or-nothing
// save aggregation for SlaRulesTable — kept out of the component so the
// component stays presentational.
export function useSlaRulesForm(rows: SlaConfigRow[], onSaveAll: (changes: SlaConfigChange[]) => void): UseSlaRulesFormResult {
  const [rowState, setRowState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.categoryId,
        { maxResolutionHours: String(row.maxResolutionHours), escalationEnabled: row.escalationEnabled },
      ])
    )
  )
  const [rowErrors, setRowErrors] = useState<RowErrors>({})

  const getStateFor = (state: Record<string, RowState>, categoryId: string): RowState => {
    const row = rows.find((r) => r.categoryId === categoryId)
    return (
      state[categoryId] ?? {
        maxResolutionHours: String(row?.maxResolutionHours ?? ''),
        escalationEnabled: row?.escalationEnabled ?? false,
      }
    )
  }

  const getRowState = (row: SlaConfigRow): RowState =>
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

  const isDirty = (row: SlaConfigRow): boolean => {
    const state = getRowState(row)
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
      const state = getRowState(row)
      const result = parseWithFirstError(updateSlaConfigSchema, {
        maxResolutionHours: Number(state.maxResolutionHours),
        escalationEnabled: state.escalationEnabled,
      })

      if (!result.success) {
        nextErrors[row.categoryId] = result.message
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

  return { getRowState, rowErrors, isDirty, hasDirtyRows, handleHoursChange, handleToggleChange, handleSaveAll }
}
