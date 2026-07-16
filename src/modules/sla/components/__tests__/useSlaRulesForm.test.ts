import { renderHook, act } from '@testing-library/react'
import type { SlaConfigRow } from '@/modules/sla/schemas'
import { useSlaRulesForm } from '../useSlaRulesForm'

const makeRow = (overrides: Partial<SlaConfigRow> = {}): SlaConfigRow => ({
  categoryId: 'cat-1',
  categoryName: 'Hardware',
  maxResolutionHours: 48,
  escalationEnabled: true,
  updatedAt: '2026-01-01T09:41:00Z',
  ...overrides,
})

describe('useSlaRulesForm', () => {
  it('getRowState returns the row defaults before any edit', () => {
    const row = makeRow()
    const { result } = renderHook(() => useSlaRulesForm([row], vi.fn()))

    expect(result.current.getRowState(row)).toEqual({
      maxResolutionHours: '48',
      escalationEnabled: true,
    })
  })

  it('isDirty is false before any edit and hasDirtyRows is false', () => {
    const row = makeRow()
    const { result } = renderHook(() => useSlaRulesForm([row], vi.fn()))

    expect(result.current.isDirty(row)).toBe(false)
    expect(result.current.hasDirtyRows).toBe(false)
  })

  it('handleHoursChange marks the row dirty and updates getRowState', () => {
    const row = makeRow()
    const { result } = renderHook(() => useSlaRulesForm([row], vi.fn()))

    act(() => {
      result.current.handleHoursChange('cat-1', '72')
    })

    expect(result.current.getRowState(row).maxResolutionHours).toBe('72')
    expect(result.current.isDirty(row)).toBe(true)
    expect(result.current.hasDirtyRows).toBe(true)
  })

  it('handleToggleChange marks the row dirty and updates getRowState', () => {
    const row = makeRow()
    const { result } = renderHook(() => useSlaRulesForm([row], vi.fn()))

    act(() => {
      result.current.handleToggleChange('cat-1', false)
    })

    expect(result.current.getRowState(row).escalationEnabled).toBe(false)
    expect(result.current.isDirty(row)).toBe(true)
  })

  it('handleSaveAll calls onSaveAll with only the changed rows', () => {
    const rowA = makeRow()
    const rowB = makeRow({ categoryId: 'cat-2', categoryName: 'Software', maxResolutionHours: 24, escalationEnabled: false })
    const onSaveAll = vi.fn()
    const { result } = renderHook(() => useSlaRulesForm([rowA, rowB], onSaveAll))

    act(() => {
      result.current.handleHoursChange('cat-1', '72')
    })
    act(() => {
      result.current.handleSaveAll()
    })

    expect(onSaveAll).toHaveBeenCalledWith([
      { categoryId: 'cat-1', maxResolutionHours: 72, escalationEnabled: true },
    ])
  })

  it('handleSaveAll does nothing when no row is dirty', () => {
    const row = makeRow()
    const onSaveAll = vi.fn()
    const { result } = renderHook(() => useSlaRulesForm([row], onSaveAll))

    act(() => {
      result.current.handleSaveAll()
    })

    expect(onSaveAll).not.toHaveBeenCalled()
  })

  it('handleSaveAll sets a rowError and does not call onSaveAll when a dirty row is out of range (>999)', () => {
    const row = makeRow()
    const onSaveAll = vi.fn()
    const { result } = renderHook(() => useSlaRulesForm([row], onSaveAll))

    act(() => {
      result.current.handleHoursChange('cat-1', '1000')
    })
    act(() => {
      result.current.handleSaveAll()
    })

    expect(onSaveAll).not.toHaveBeenCalled()
    expect(result.current.rowErrors['cat-1']).toBe('Las horas máximas deben estar entre 1 y 999')
  })

  it('handleSaveAll is all-or-nothing: one invalid dirty row blocks all changes', () => {
    const rowA = makeRow()
    const rowB = makeRow({ categoryId: 'cat-2', categoryName: 'Software', maxResolutionHours: 24 })
    const onSaveAll = vi.fn()
    const { result } = renderHook(() => useSlaRulesForm([rowA, rowB], onSaveAll))

    act(() => {
      result.current.handleHoursChange('cat-1', '72')
    })
    act(() => {
      result.current.handleHoursChange('cat-2', '0')
    })
    act(() => {
      result.current.handleSaveAll()
    })

    expect(onSaveAll).not.toHaveBeenCalled()
    expect(result.current.rowErrors['cat-2']).toBe('Las horas máximas deben estar entre 1 y 999')
  })
})
