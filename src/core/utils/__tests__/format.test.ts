import { formatRelativeTime } from '../format'

describe('formatRelativeTime', () => {
  it('renders "hace unos segundos" for timestamps under a minute old', () => {
    const now = new Date('2026-07-02T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date('2026-07-02T11:59:45Z') // 15s ago

    expect(formatRelativeTime(date)).toBe('hace unos segundos')
  })

  it('renders minutes for timestamps under an hour old', () => {
    const now = new Date('2026-07-02T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date('2026-07-02T11:55:00Z') // 5 min ago

    expect(formatRelativeTime(date)).toBe('hace 5 minutos')
  })

  it('renders hours for timestamps under a day old', () => {
    const now = new Date('2026-07-02T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date('2026-07-02T09:00:00Z') // 3 hours ago

    expect(formatRelativeTime(date)).toBe('hace 3 horas')
  })

  it('renders days for timestamps 3+ days old', () => {
    const now = new Date('2026-07-02T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date('2026-06-29T12:00:00Z') // 3 days ago

    expect(formatRelativeTime(date)).toBe('hace 3 días')
  })

  it('renders the idiomatic "ayer" for a timestamp exactly one day old (numeric: auto)', () => {
    const now = new Date('2026-07-02T12:00:00Z')
    vi.setSystemTime(now)

    const date = new Date('2026-07-01T12:00:00Z') // 1 day ago

    expect(formatRelativeTime(date)).toBe('ayer')
  })

  it('accepts a string date input', () => {
    const now = new Date('2026-07-02T12:00:00Z')
    vi.setSystemTime(now)

    expect(formatRelativeTime('2026-07-02T11:55:00Z')).toBe('hace 5 minutos')
  })
})
