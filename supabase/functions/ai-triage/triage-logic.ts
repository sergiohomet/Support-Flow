// ai-triage / triage-logic.ts
//
// Deno-agnostic logic for the ai-triage Edge Function: prompt building,
// caller authorization, and parsing + validating the Gemini `interactions`
// response. Deliberately has ZERO Deno-specific APIs (no Deno.serve,
// Deno.env, etc.) so it can be imported and unit-tested directly under
// vitest (this project's real test runner) — see triage-logic.test.ts.
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
  confidence: number
}

/**
 * Builds the zod schema for a single triage result, constrained to the
 * real category ids fetched from `public.categories` for this call — a
 * syntactically valid UUID that names a category NOT in that list is
 * still rejected.
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
    confidence: z.number().min(0).max(1),
  })
}

/**
 * Builds the exact prompt string sent as `input` to the Gemini
 * `interactions` endpoint. Kept here (not inline in index.ts) so it's
 * reviewable and can be referenced verbatim from the PR description.
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

interface InteractionStep {
  type?: unknown
  content?: Array<{ type?: unknown; text?: unknown }>
}

interface InteractionResponse {
  status?: unknown
  steps?: unknown
}

/**
 * Finds the `model_output` step in a Gemini `interactions` response
 * (searched by `type`, never by fixed index — the `thought` step may be
 * absent or appear in a different position), JSON.parses its inner
 * `content[0].text` string, and validates the result against the triage
 * schema constrained to `validCategoryIds`.
 *
 * Returns `null` on ANY failure — unexpected top-level shape, non-array
 * `steps`, missing `model_output` step, missing/non-string inner text,
 * unparseable JSON, or schema validation failure (including an
 * out-of-range confidence or a category id not in `validCategoryIds`).
 * Never throws — the caller (index.ts) treats `null` as "no triage
 * result produced" and silently no-ops.
 */
export function parseTriageInteractionResponse(
  rawResponse: unknown,
  validCategoryIds: string[],
): TriageResult | null {
  try {
    if (typeof rawResponse !== 'object' || rawResponse === null) return null

    const response = rawResponse as InteractionResponse
    if (!Array.isArray(response.steps)) return null

    const modelOutputStep = (response.steps as InteractionStep[]).find(
      (step) => typeof step === 'object' && step !== null && step.type === 'model_output',
    )
    if (!modelOutputStep) return null

    const innerText = modelOutputStep.content?.[0]?.text
    if (typeof innerText !== 'string') return null

    const parsedInner: unknown = JSON.parse(innerText)

    const schema = buildTriageResultSchema(validCategoryIds)
    const result = schema.safeParse(parsedInner)
    if (!result.success) return null

    return result.data
  } catch {
    return null
  }
}
