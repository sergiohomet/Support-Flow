import {
  parseOpenRouterChatCompletion,
  isAuthorizedCaller,
  buildTriagePrompt,
} from './triage-logic'

const CATEGORY_A = '123e4567-e89b-12d3-a456-426614174000'
const CATEGORY_B = '223e4567-e89b-12d3-a456-426614174001'
const VALID_CATEGORY_IDS = [CATEGORY_A, CATEGORY_B]

function buildResponse(overrides: {
  content?: unknown
  noChoices?: boolean
} = {}) {
  if (overrides.noChoices) {
    return {
      id: 'gen-1',
      model: 'openai/gpt-oss-20b:free',
      choices: undefined,
    }
  }

  return {
    id: 'gen-1',
    model: 'openai/gpt-oss-20b:free',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: overrides.content },
        finish_reason: 'stop',
      },
    ],
  }
}

const VALID_INNER_RESULT = {
  suggestedCategoryId: CATEGORY_A,
  suggestedPriority: 'alta',
  suggestedResponse: 'Gracias por escribirnos, ya estamos revisando tu caso.',
  confidence: 0.87,
}

describe('parseOpenRouterChatCompletion', () => {
  it('parses a valid full response into the correct object', () => {
    const raw = buildResponse({ content: JSON.stringify(VALID_INNER_RESULT) })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toEqual(VALID_INNER_RESULT)
  })

  it('rejects (null) when suggestedCategoryId is not in the given category list', () => {
    const raw = buildResponse({
      content: JSON.stringify({ ...VALID_INNER_RESULT, suggestedCategoryId: '999e4567-e89b-12d3-a456-426614174999' }),
    })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when choices is missing entirely', () => {
    const raw = buildResponse({ noChoices: true })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when choices is an empty array', () => {
    const raw = { id: 'gen-1', model: 'openai/gpt-oss-20b:free', choices: [] }

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when message is missing on choices[0]', () => {
    const raw = { id: 'gen-1', model: 'openai/gpt-oss-20b:free', choices: [{ index: 0, finish_reason: 'stop' }] }

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when message.content is not a string', () => {
    const raw = buildResponse({ content: { not: 'a string' } })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when the inner content is not parseable JSON', () => {
    const raw = buildResponse({ content: '{not valid json' })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when a required field is missing', () => {
    const missingField = {
      suggestedCategoryId: VALID_INNER_RESULT.suggestedCategoryId,
      suggestedPriority: VALID_INNER_RESULT.suggestedPriority,
      confidence: VALID_INNER_RESULT.confidence,
    }
    const raw = buildResponse({ content: JSON.stringify(missingField) })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when confidence is out of the 0-1 range', () => {
    const raw = buildResponse({ content: JSON.stringify({ ...VALID_INNER_RESULT, confidence: 1.5 }) })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when confidence is negative', () => {
    const raw = buildResponse({ content: JSON.stringify({ ...VALID_INNER_RESULT, confidence: -0.1 }) })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when suggestedPriority is not one of the valid enum values', () => {
    const raw = buildResponse({ content: JSON.stringify({ ...VALID_INNER_RESULT, suggestedPriority: 'urgente' }) })

    const result = parseOpenRouterChatCompletion(raw, VALID_CATEGORY_IDS)

    expect(result).toBeNull()
  })

  it('rejects (null) when the raw response is not an object', () => {
    expect(parseOpenRouterChatCompletion(null, VALID_CATEGORY_IDS)).toBeNull()
    expect(parseOpenRouterChatCompletion('a string', VALID_CATEGORY_IDS)).toBeNull()
    expect(parseOpenRouterChatCompletion(undefined, VALID_CATEGORY_IDS)).toBeNull()
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
