import { act, renderHook } from '@testing-library/react'
import { useReportsPageState } from '../useReportsPageState'
import type { AgentPerformance } from '@/modules/reports/schemas'

const fakeAgentPerformance: AgentPerformance[] = [
  {
    agentId: 'a-1',
    agentFullName: 'Sergio Hardware',
    resolvedCount: 12,
    avgWorkingHours: 3.4,
    slaCompliancePct: 88,
  },
  {
    agentId: 'a-2',
    agentFullName: 'Ana Soporte',
    resolvedCount: 5,
    avgWorkingHours: null,
    slaCompliancePct: null,
  },
]

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

  it('exposes the csv headers ExportCsvButton expects', () => {
    const { result } = renderHook(() => useReportsPageState())

    expect(result.current.csvHeaders).toEqual([
      'Agente',
      'Tickets resueltos',
      'Tiempo prom. (horas)',
      'SLA cumplido (%)',
    ])
  })

  it('buildCsvRows shapes agent performance rows for ExportCsvButton, falling back to empty string for null metrics', () => {
    const { result } = renderHook(() => useReportsPageState())

    expect(result.current.buildCsvRows(fakeAgentPerformance)).toEqual([
      ['Sergio Hardware', 12, 3.4, 88],
      ['Ana Soporte', 5, '', ''],
    ])
  })

  it('buildCsvRows returns an empty array when there is no agent performance data', () => {
    const { result } = renderHook(() => useReportsPageState())

    expect(result.current.buildCsvRows([])).toEqual([])
  })
})
