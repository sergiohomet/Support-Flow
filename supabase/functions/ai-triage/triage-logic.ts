// ai-triage / triage-logic.ts
//
// Deno-agnostic logic for the ai-triage Edge Function: prompt building,
// caller authorization, and parsing + validating the OpenRouter
// `chat/completions` response. Deliberately has ZERO Deno-specific APIs
// (no Deno.serve, Deno.env, etc.) so it can be imported and unit-tested
// directly under vitest (this project's real test runner) — see
// triage-logic.test.ts.
//
// The only external dependency is zod, imported the same way the rest of
// this repo's Edge Functions import third-party packages (esm.sh URL
// specifier, matching supabase/functions/sla-escalation-check/index.ts and
// supabase/functions/create-user/index.ts, both of which import
// '@supabase/supabase-js' from esm.sh). vite.config.ts aliases this exact
// specifier to the local 'zod' npm package so vitest can resolve it too —
// see the `resolve.alias` entry there.
import { z } from 'https://esm.sh/zod@4.4.3'

export interface CategoryOption {
  id: string
  name: string
}

export interface TicketForTriage {
  title: string
  description: string
}

const PRIORITY_VALUES = ['baja', 'media', 'alta', 'critica'] as const

export type SuggestedPriority = (typeof PRIORITY_VALUES)[number]

export interface TriageResult {
  suggestedCategoryId: string
  suggestedPriority: SuggestedPriority
  suggestedResponse: string
  confidence: number | null
}

/**
 * Builds the zod schema for a single triage result, constrained to the
 * real category ids fetched from `public.categories` for this call — a
 * syntactically valid UUID that names a category NOT in that list is
 * still rejected.
 *
 * `confidence` is optional/nullable with a `null` default — live-verified
 * against the real openai/gpt-oss-20b:free endpoint: it does not always
 * include `confidence` in its structured output despite the schema
 * marking it `required` (a known reliability gap of this free-tier
 * model's strict-mode compliance). Rather than discarding an otherwise
 * complete, usable suggestion (valid category, priority, and response
 * draft) over one missing cosmetic field, `null` means "the model didn't
 * report a confidence" — the review panel simply omits the confidence
 * badge in that case, consistent with how any other missing suggestion
 * field is handled (render only the parts that are present). This is
 * NOT the same as fabricating a fake number when the model gave none.
 * A confidence value that IS present but out of the 0-1 range is still
 * rejected as invalid.
 */
export function buildTriageResultSchema(validCategoryIds: string[]) {
  return z.object({
    suggestedCategoryId: z
      .string()
      .uuid()
      .refine((id) => validCategoryIds.includes(id), {
        message: 'suggestedCategoryId must be one of the categories provided to the model',
      }),
    suggestedPriority: z.enum(PRIORITY_VALUES),
    suggestedResponse: z.string().min(1),
    confidence: z.number().min(0).max(1).nullable().optional().default(null),
  })
}

/**
 * Builds the exact prompt string sent as the user message to the
 * OpenRouter `chat/completions` endpoint. Kept here (not inline in
 * index.ts) so it's reviewable and can be referenced verbatim from the
 * PR description.
 */
export function buildTriagePrompt(ticket: TicketForTriage, categories: CategoryOption[]): string {
  const categoryList = categories.map((c) => `- ${c.id}: ${c.name}`).join('\n')

  return `Sos un asistente de triage para una mesa de ayuda (helpdesk) de soporte técnico. Analizá el siguiente ticket y sugerí cómo clasificarlo.

Título: ${ticket.title}
Descripción: ${ticket.description}

Categorías válidas (elegí el id EXACTO de una de estas, no inventes otro id):
${categoryList}

Prioridades válidas: baja, media, alta, critica.

Devolvé un objeto JSON con estos campos:
- suggestedCategoryId: el id de la categoría más adecuada (debe ser uno de los ids listados arriba, tal cual).
- suggestedPriority: la prioridad sugerida (baja, media, alta o critica).
- suggestedResponse: un borrador breve de primera respuesta para el cliente, en español, con un tono profesional y cordial.
- confidence: un número entre 0 y 1 que indique tu nivel de confianza en esta clasificación.`
}

/**
 * Validates the caller's Authorization header against the trigger secret.
 * Returns false (never throws) if the secret isn't configured at all —
 * a missing secret must never be treated as "anything goes".
 */
export function isAuthorizedCaller(authHeader: string | null, expectedSecret: string | undefined): boolean {
  if (!expectedSecret) return false
  return authHeader === `Bearer ${expectedSecret}`
}

interface ChatCompletionChoice {
  message?: { role?: unknown; content?: unknown }
}

interface ChatCompletionResponse {
  choices?: unknown
}

/**
 * Parses an OpenRouter `chat/completions` response (the standard
 * OpenAI-compatible envelope), JSON.parses the inner `choices[0].message.content`
 * string, and validates the result against the triage schema constrained
 * to `validCategoryIds`.
 *
 * Returns `null` on ANY failure — unexpected top-level shape, missing or
 * empty `choices` array, missing `message`, missing/non-string
 * `message.content`, unparseable JSON, or schema validation failure
 * (including an out-of-range confidence or a category id not in
 * `validCategoryIds`). Never throws — the caller (index.ts) treats `null`
 * as "no triage result produced" and silently no-ops.
 */
export function parseOpenRouterChatCompletion(
  rawResponse: unknown,
  validCategoryIds: string[],
): TriageResult | null {
  try {
    if (typeof rawResponse !== 'object' || rawResponse === null) return null

    const response = rawResponse as ChatCompletionResponse
    if (!Array.isArray(response.choices) || response.choices.length === 0) return null

    const firstChoice = response.choices[0] as ChatCompletionChoice
    if (typeof firstChoice !== 'object' || firstChoice === null) return null

    const content = firstChoice.message?.content
    if (typeof content !== 'string') return null

    const parsedInner: unknown = JSON.parse(content)

    const schema = buildTriageResultSchema(validCategoryIds)
    const result = schema.safeParse(parsedInner)
    if (!result.success) return null

    return result.data
  } catch {
    return null
  }
}
