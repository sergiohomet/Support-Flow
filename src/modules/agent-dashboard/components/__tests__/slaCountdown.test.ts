import { getCompactSlaStatus } from '../slaCountdown'

describe('getCompactSlaStatus', () => {
  it('returns danger/Vencido when escalatedAt is set, regardless of remaining time', () => {
    const result = getCompactSlaStatus({
      escalatedAt: '2026-07-12T08:00:00Z',
      slaHours: 4,
      createdAt: '2026-07-12T00:00:00Z',
    })

    expect(result).toEqual({ tone: 'danger', label: 'Vencido', icon: 'error' })
  })

  it('returns normal/Sin SLA when slaHours is null and not escalated', () => {
    const result = getCompactSlaStatus({
      escalatedAt: null,
      slaHours: null,
      createdAt: '2026-07-12T00:00:00Z',
    })

    expect(result).toEqual({ tone: 'normal', label: 'Sin SLA', icon: 'schedule' })
  })

  it('returns warning tone with remaining time when under the 2h urgent threshold', () => {
    const now = new Date('2026-07-12T10:30:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    // createdAt + slaHours = 2026-07-12T12:00:00Z → 1h30m remaining
    const result = getCompactSlaStatus({
      escalatedAt: null,
      slaHours: 12,
      createdAt: '2026-07-12T00:00:00Z',
    })

    expect(result.tone).toBe('warning')
    expect(result.label).toBe('1h 30m')
    expect(result.icon).toBe('schedule')

    vi.useRealTimers()
  })

  it('returns normal tone with remaining time when above the 2h urgent threshold', () => {
    const now = new Date('2026-07-12T00:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    // createdAt + slaHours = 2026-07-13T00:00:00Z → 24h remaining
    const result = getCompactSlaStatus({
      escalatedAt: null,
      slaHours: 24,
      createdAt: '2026-07-12T00:00:00Z',
    })

    expect(result.tone).toBe('normal')
    expect(result.label).toBe('24h 0m')
    expect(result.icon).toBe('schedule')

    vi.useRealTimers()
  })

  it('treats a negative remaining time (past deadline, not yet escalated) as danger/Vencido', () => {
    const now = new Date('2026-07-13T00:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    // createdAt + slaHours = 2026-07-12T02:00:00Z, already past
    const result = getCompactSlaStatus({
      escalatedAt: null,
      slaHours: 2,
      createdAt: '2026-07-12T00:00:00Z',
    })

    expect(result).toEqual({ tone: 'danger', label: 'Vencido', icon: 'error' })

    vi.useRealTimers()
  })
})
