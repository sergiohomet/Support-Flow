import { getComplianceTier, isTicketUrgent } from '../slaThresholds'

describe('getComplianceTier', () => {
  it('returns green at exactly 80%', () => {
    expect(getComplianceTier(80)).toBe('green')
  })

  it('returns green above 80%', () => {
    expect(getComplianceTier(91)).toBe('green')
  })

  it('returns amber at exactly 70%', () => {
    expect(getComplianceTier(70)).toBe('amber')
  })

  it('returns amber between 70% and 80%', () => {
    expect(getComplianceTier(78)).toBe('amber')
  })

  it('returns red below 70%', () => {
    expect(getComplianceTier(69)).toBe('red')
  })

  it('returns red for null (no data)', () => {
    expect(getComplianceTier(null)).toBe('red')
  })
})

describe('isTicketUrgent', () => {
  it('returns false at exactly 60 minutes', () => {
    expect(isTicketUrgent(60)).toBe(false)
  })

  it('returns true just under 60 minutes', () => {
    expect(isTicketUrgent(59)).toBe(true)
  })

  it('returns false just over 60 minutes', () => {
    expect(isTicketUrgent(61)).toBe(false)
  })
})
