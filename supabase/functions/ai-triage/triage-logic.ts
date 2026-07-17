// ai-triage / triage-logic.ts
//
// Lógica agnóstica de Deno para la Edge Function ai-triage: construcción
// del prompt, autorización de quien llama, y parseo + validación de la
// respuesta `chat/completions` de OpenRouter. Deliberadamente no tiene
// NINGUNA API específica de Deno (nada de Deno.serve, Deno.env, etc.)
// para poder importarse y testearse con unit tests directamente bajo
// vitest (el test runner real de este proyecto) — ver
// triage-logic.test.ts.
//
// La única dependencia externa es zod, importada de la misma forma en
// que el resto de las Edge Functions de este repo importan paquetes de
// terceros (specifier de URL de esm.sh, igual que
// supabase/functions/sla-escalation-check/index.ts y
// supabase/functions/create-user/index.ts, que importan ambas
// '@supabase/supabase-js' desde esm.sh). vite.config.ts alía este mismo
// specifier al paquete npm local 'zod' para que vitest también pueda
// resolverlo — ver la entrada `resolve.alias` ahí.
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
 * Construye el schema de zod para un resultado de triage individual,
 * restringido a los ids de categoría reales obtenidos desde
 * `public.categories` para esta llamada — un string que nombra una
 * categoría que NO está en esa lista igual se rechaza.
 *
 * `confidence` es opcional/nullable con un default de `null` —
 * verificado en vivo contra el endpoint real de openai/gpt-oss-20b:free:
 * no siempre incluye `confidence` en su salida estructurada a pesar de
 * que el schema lo marca como `required` (una falencia de confiabilidad
 * conocida en el cumplimiento del strict-mode de este modelo de nivel
 * gratuito). En lugar de descartar una sugerencia que por lo demás está
 * completa y es utilizable (categoría, prioridad y borrador de respuesta
 * válidos) por un único campo cosmético faltante, `null` significa "el
 * modelo no reportó una confianza" — el panel de revisión simplemente
 * omite el badge de confianza en ese caso, de forma consistente con cómo
 * se maneja cualquier otro campo faltante de la sugerencia (renderizar
 * solo las partes que están presentes). Esto NO es lo mismo que fabricar
 * un número falso cuando el modelo no dio ninguno. Un valor de
 * confidence que SÍ está presente pero fuera del rango 0-1 igual se
 * rechaza como inválido.
 */
export function buildTriageResultSchema(validCategoryIds: string[]) {
  return z.object({
    // Deliberadamente NO usa `.uuid()` — el chequeo de formato estricto
    // de Zod exige los nibbles de versión/variante de RFC 4122, pero los
    // ids de categoría de este proyecto (p. ej.
    // `11111111-1111-1111-1111-111111111111`) no cumplen ese formato a
    // pesar de ser filas reales y válidas en `public.categories`.
    // Verificado en vivo que esto rechazaba en silencio cada sugerencia
    // correcta — el `.refine()` de abajo (pertenencia exacta a la lista
    // real de ids de categoría obtenida para esta llamada) es de por sí
    // estrictamente más fuerte que cualquier chequeo de formato, así que
    // el chequeo de formato era redundante además de estar activamente
    // equivocado para la forma de los ids de este proyecto.
    suggestedCategoryId: z
      .string()
      .refine((id) => validCategoryIds.includes(id), {
        message: 'suggestedCategoryId must be one of the categories provided to the model',
      }),
    suggestedPriority: z.enum(PRIORITY_VALUES),
    suggestedResponse: z.string().min(1),
    confidence: z.number().min(0).max(1).nullable().optional().default(null),
  })
}

/**
 * Construye el string exacto del prompt que se envía como mensaje de
 * usuario al endpoint `chat/completions` de OpenRouter. Se mantiene acá
 * (y no inline en index.ts) para que sea revisable y se pueda
 * referenciar textualmente desde la descripción del PR.
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
 * Valida el header Authorization de quien llama contra el secreto de
 * trigger. Devuelve false (nunca lanza una excepción) si el secreto no
 * está configurado en absoluto — un secreto faltante nunca debe tratarse
 * como "todo vale".
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
 * Parsea una respuesta `chat/completions` de OpenRouter (el envelope
 * estándar compatible con OpenAI), hace JSON.parse del string interno
 * `choices[0].message.content`, y valida el resultado contra el schema
 * de triage restringido a `validCategoryIds`.
 *
 * Devuelve `null` ante CUALQUIER falla — forma de nivel superior
 * inesperada, array `choices` faltante o vacío, `message` faltante,
 * `message.content` faltante o que no sea string, JSON no parseable, o
 * falla de validación del schema (incluyendo un confidence fuera de
 * rango o un id de categoría que no esté en `validCategoryIds`). Nunca
 * lanza una excepción — quien llama (index.ts) trata `null` como "no se
 * produjo un resultado de triage" y hace no-op en silencio.
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
