import { act, renderHook } from '@testing-library/react'
import { useReportsPageState } from '../useReportsPageState'

describe('useReportsPageState', () => {
  it('defaults preset to last30 and returns a computed date range', () => {
    const { result } = renderHook(() => useReportsPageState())

    expect(result.current.preset).toBe('last30')
    expect(result.current.dateFrom).toBeTruthy()
    expect(result.current.dateTo).toBeTruthy()
  })

  it('recomputes the date range when the preset changes', () => {
    const { result } = renderHook(() => useReportsPageState())
    const initialDateFrom = result.current.dateFrom

    act(() => {
      result.current.setPreset('thisMonth')
    })

    expect(result.current.preset).toBe('thisMonth')
    expect(result.current.dateFrom).not.toBe(initialDateFrom)
  })

  it('does not recompute the date range on a re-render when the preset is unchanged', () => {
    const { result, rerender } = renderHook(() => useReportsPageState())
    const { dateFrom, dateTo } = result.current

    rerender()

    expect(result.current.dateFrom).toBe(dateFrom)
    expect(result.current.dateTo).toBe(dateTo)
  })

  it('computeEscalatedPct returns 0 when totalTickets is 0', () => {
    const { result } = renderHook(() => useReportsPageState())

    expect(result.current.computeEscalatedPct(0, 0)).toBe(0)
    expect(result.current.computeEscalatedPct(0, 5)).toBe(0)
  })

  it('computeEscalatedPct computes the rounded percentage otherwise', () => {
    const { result } = renderHook(() => useReportsPageState())

    expect(result.current.computeEscalatedPct(20, 5)).toBe(25)
    expect(result.current.computeEscalatedPct(3, 1)).toBe(33)
  })
})
