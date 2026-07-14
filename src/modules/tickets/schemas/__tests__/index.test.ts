import { aiTriageSchema, ticketDetailSchema } from '../index'

const validAiTriage = {
  suggestedCategoryId: '11111111-1111-1111-1111-111111111111',
  suggestedPriority: 'alta',
  suggestedResponse: 'Estimado cliente, ya estamos revisando tu caso.',
  confidence: 0.9,
  generatedAt: '2026-07-14T16:07:15.463Z',
}

function omit<T extends Record<string, unknown>>(obj: T, key: keyof T): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...obj }
  delete copy[key as string]
  return copy
}

const validTicketDetail = {
  id: 'ticket-1',
  title: 'No puedo acceder',
  description: 'Me tira error 500 al loguearme',
  status: 'abierto',
  priority: 'alta',
  categoryId: 'cat-1',
  categoryName: 'Accesos',
  categoryIsActive: true,
  clientId: 'client-1',
  clientFullName: 'Juan Perez',
  agentId: null,
  agentFullName: null,
  aiTriage: null,
  createdAt: '2026-07-14T10:00:00Z',
  updatedAt: '2026-07-14T10:00:00Z',
  escalatedAt: null,
  slaHours: null,
}

describe('aiTriageSchema', () => {
  it('parses a full valid ai_triage object', () => {
    const result = aiTriageSchema.safeParse(validAiTriage)
    expect(result.success).toBe(true)
  })

  it('accepts confidence: null (model sometimes omits it, defaulted server-side)', () => {
    const result = aiTriageSchema.safeParse({ ...validAiTriage, confidence: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.confidence).toBeNull()
    }
  })

  it('accepts a suggestedCategoryId shaped like real seed data (not RFC 4122-strict, e.g. 11111111-1111-1111-1111-111111111111)', () => {
    // Regression test mirroring supabase/functions/ai-triage/triage-logic.test.ts —
    // this project's real category ids fail Zod's strict .uuid() format check
    // (wrong version/variant nibbles), so suggestedCategoryId must stay a plain
    // z.string() here too. Do NOT add .uuid() to this field.
    const result = aiTriageSchema.safeParse({
      ...validAiTriage,
      suggestedCategoryId: '11111111-1111-1111-1111-111111111111',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.suggestedCategoryId).toBe('11111111-1111-1111-1111-111111111111')
    }
  })

  it('fails when suggestedCategoryId is missing', () => {
    const result = aiTriageSchema.safeParse(omit(validAiTriage, 'suggestedCategoryId'))
    expect(result.success).toBe(false)
  })

  it('fails when suggestedPriority is missing', () => {
    const result = aiTriageSchema.safeParse(omit(validAiTriage, 'suggestedPriority'))
    expect(result.success).toBe(false)
  })

  it('fails when suggestedResponse is missing', () => {
    const result = aiTriageSchema.safeParse(omit(validAiTriage, 'suggestedResponse'))
    expect(result.success).toBe(false)
  })

  it('fails when generatedAt is missing', () => {
    const result = aiTriageSchema.safeParse(omit(validAiTriage, 'generatedAt'))
    expect(result.success).toBe(false)
  })

  it('fails when suggestedPriority is not a valid enum value', () => {
    const result = aiTriageSchema.safeParse({ ...validAiTriage, suggestedPriority: 'urgente' })
    expect(result.success).toBe(false)
  })

  it('fails when confidence is out of 0-1 range', () => {
    const result = aiTriageSchema.safeParse({ ...validAiTriage, confidence: 1.5 })
    expect(result.success).toBe(false)
  })
})

describe('ticketDetailSchema — aiTriage field', () => {
  it('parses a ticket with aiTriage: null', () => {
    const result = ticketDetailSchema.safeParse(validTicketDetail)
    expect(result.success).toBe(true)
  })

  it('parses a ticket with a full valid aiTriage object', () => {
    const result = ticketDetailSchema.safeParse({ ...validTicketDetail, aiTriage: validAiTriage })
    expect(result.success).toBe(true)
  })

  it('fails when aiTriage is a malformed object (missing required field)', () => {
    const malformed = omit(validAiTriage, 'suggestedResponse')
    const result = ticketDetailSchema.safeParse({ ...validTicketDetail, aiTriage: malformed })
    expect(result.success).toBe(false)
  })
})
