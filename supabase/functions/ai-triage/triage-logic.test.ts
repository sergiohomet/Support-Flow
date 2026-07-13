import {
  parseTriageInteractionResponse,
  isAuthorizedCaller,
  buildTriagePrompt,
} from './triage-logic'

const CATEGORY_A = '123e4567-e89b-12d3-a456-426614174000'
const CATEGORY_B = '223e4567-e89b-12d3-a456-426614174001'
const VALID_CATEGORY_IDS = [CATEGORY_A, CATEGORY_B]

function buildResponse(overrides: {
  steps?: unknown
  status?: string
} = {}) {
  return {
    id: 'interaction-1',
    status: overrides.status ?? 'completed',
    usage: {},
    created: '2026-07-13T00:00:00Z',
    steps: overrides.steps,
    object: 'interaction',
    model: 'gemini-3.5-flash',
  }
}

function modelOutputStep(text: string) {
  return {
    type: 'model_output',
    content: [{ type: 'text', text }],
  }
}

const VALID_INNER_RESULT = {
  suggestedCategoryId: CATEGORY_A,
  suggestedPriority: 'alta',
  suggestedResponse: 'Gracias por escribirnos, ya estamos revisando tu caso.',
  confidence: 0.87,
}

describe('parseTriageInteractionResponse', () => {
  it('parses a valid full response into the correct object', () => {
    const raw = buildResponse({
      steps: [
        { type: 'thought', signature: 'sig-1' },
        modelOutputStep(JSON.stringify(VALID_INNER_RESULT)),
      ],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toEqual(VALID_INNER_RESULT)
  })

  it('finds the model_output step regardless of position (thought step absent)', () => {
    const raw = buildResponse({
      steps: [modelOutputStep(JSON.stringify(VALID_INNER_RESULT))],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toEqual(VALID_INNER_RESULT)
  })

  it('finds the model_output step when it is not the last entry', () => {
    const raw = buildResponse({
      steps: [
        modelOutputStep(JSON.stringify(VALID_INNER_RESULT)),
        { type: 'thought', signature: 'sig-after' },
      ],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toEqual(VALID_INNER_RESULT)
  })

  it('rejects (null) when suggestedCategoryId is not in the given category list', () => {
    const raw = buildResponse({
      steps: [
        modelOutputStep(
          JSON.stringify({ ...VALID_INNER_RESULT, suggestedCategoryId: '999e4567-e89b-12d3-a456-426614174999' }),
        ),
      ],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when the model_output step is missing entirely', () => {
    const raw = buildResponse({
      steps: [{ type: 'thought', signature: 'sig-only' }],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when steps is missing/not an array', () => {
    const raw = buildResponse({ steps: undefined })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when the inner text is not parseable JSON', () => {
    const raw = buildResponse({
      steps: [modelOutputStep('{not valid json')],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when a required field is missing', () => {
    const missingField = {
      suggestedCategoryId: VALID_INNER_RESULT.suggestedCategoryId,
      suggestedPriority: VALID_INNER_RESULT.suggestedPriority,
      confidence: VALID_INNER_RESULT.confidence,
    }
    const raw = buildResponse({
      steps: [modelOutputStep(JSON.stringify(missingField))],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when confidence is out of the 0-1 range', () => {
    const raw = buildResponse({
      steps: [modelOutputStep(JSON.stringify({ ...VALID_INNER_RESULT, confidence: 1.5 }))],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when confidence is negative', () => {
    const raw = buildResponse({
      steps: [modelOutputStep(JSON.stringify({ ...VALID_INNER_RESULT, confidence: -0.1 }))],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when suggestedPriority is not one of the valid enum values', () => {
    const raw = buildResponse({
      steps: [modelOutputStep(JSON.stringify({ ...VALID_INNER_RESULT, suggestedPriority: 'urgente' }))],
    })

    const result = parseTriageInteractionResponse(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when the raw response is not an object', () => {
    expect(parseTriageInteractionResponse(null, VALID_CATEGORY_IDS)).toBeNull()
    expect(parseTriageInteractionResponse('a string', VALID_CATEGORY_IDS)).toBeNull()
    expect(parseTriageInteractionResponse(undefined, VALID_CATEGORY_IDS)).toBeNull()
  })
})

describe('isAuthorizedCaller', () => {
  const SECRET = 'trigger-secret-value'

  it('returns true when the Authorization header matches Bearer <secret>', () => {
    expect(isAuthorizedCaller(`Bearer ${SECRET}`, SECRET)).toBe(true)
  })

  it('returns false on a mismatched Authorization header', () => {
    expect(isAuthorizedCaller('Bearer wrong-value', SECRET)).toBe(false)
  })

  it('returns false when the Authorization header is missing', () => {
    expect(isAuthorizedCaller(null, SECRET)).toBe(false)
  })

  it('returns false when the expected secret env var is not configured', () => {
    expect(isAuthorizedCaller(`Bearer ${SECRET}`, undefined)).toBe(false)
  })
})

describe('buildTriagePrompt', () => {
  it('includes the ticket title/description and every category id/name', () => {
    const prompt = buildTriagePrompt(
      { title: 'No puedo acceder a mi cuenta', description: 'Me tira error 500 al loguearme' },
      [
        { id: CATEGORY_A, name: 'Accesos' },
        { id: CATEGORY_B, name: 'Facturación' },
      ],
    )

    expect(prompt).toContain('No puedo acceder a mi cuenta')
    expect(prompt).toContain('Me tira error 500 al loguearme')
    expect(prompt).toContain(CATEGORY_A)
    expect(prompt).toContain('Accesos')
    expect(prompt).toContain(CATEGORY_B)
    expect(prompt).toContain('Facturación')
    expect(prompt).toContain('baja, media, alta, critica')
  })
})
