// Edge Function: ai-triage
//
// PR2 del change "ai-triage". Dado un ticketId, obtiene el ticket y la
// lista completa de categorías, le pide a un LLM (vía OpenRouter) una
// sugerencia de triage estructurada (categoría, prioridad, borrador de
// primera respuesta, confianza), y — solo si todo tiene éxito — escribe
// el resultado validado en tickets.ai_triage.
//
// Por ahora es independiente/invocable manualmente: todavía nada llama a
// esta función automáticamente. PR3 agrega el trigger AFTER INSERT que la
// invoca en cada ticket nuevo; PR4/PR5 agregan la UI de frontend para
// aceptar/rechazar la sugerencia. Esta función no depende de que el
// trigger exista.
//
// AUTH: refleja el patrón de secreto compartido usado por
// sla-escalation-check, pero con su PROPIO secreto dedicado
// (AI_TRIAGE_TRIGGER_SECRET) en lugar de reutilizar
// SUPABASE_SERVICE_ROLE_KEY — ver la descripción del PR para el porqué
// (este repo ya tuvo un incidente real, documentado en la migración
// 20260701000009, donde una copia de un secreto guardada en Vault se
// desincronizó del valor que Supabase auto-inyecta; darle a ai-triage su
// propio secreto de propósito único con una única fuente de verdad evita
// por completo esa clase de bug).
//
// PROVEEDOR DE LLM: usa OpenRouter (modelo `openai/gpt-oss-20b:free`) en
// lugar de Google Gemini directamente. Este PR originalmente apuntaba al
// endpoint `/v1beta/interactions` de Gemini, pero Google AI Studio ahora
// bloquea las cuentas nuevas detrás de facturación prepaga, lo cual
// impidió aprovisionar una key funcional. El endpoint `chat/completions`
// de OpenRouter es la API estándar compatible con OpenAI (bien
// documentada, con soporte estable de structured-output vía
// `response_format.json_schema`) y no requiere facturación prepaga para
// este modelo de nivel gratuito. Si ves referencias a Gemini en el
// git history/blame, es por eso — el código de abajo nunca llegó a
// llamarlo en un estado desplegado/funcionando.
//
// SECRETOS REQUERIDOS (ver la descripción del PR para los comandos
// exactos que hay que correr en vivo — ninguno de estos se puede
// configurar desde este repo):
//   - AI_TRIAGE_TRIGGER_SECRET: secreto compartido que el (futuro, PR3)
//     trigger de la DB presenta como `Authorization: Bearer <secret>`.
//     También se guarda en Supabase Vault (como 'ai_triage_trigger_secret')
//     para que el trigger del PR3 pueda leerlo vía
//     `vault.decrypted_secrets`, de la misma forma que lo hace el cron
//     job de SLA (ver migración 20260701000008).
//   - OPENROUTER_API_KEY: exclusivo de esta función, se lee directamente
//     vía Deno.env.get, sin copia en Vault — nada más en este proyecto lo
//     necesita.
//   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: auto-inyectadas por
//     Supabase en cada Edge Function desplegada, igual que en las otras
//     dos funciones de este repo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildTriagePrompt,
  isAuthorizedCaller,
  parseOpenRouterChatCompletion,
  type CategoryOption,
} from './triage-logic.ts'

// 45s: verificado en vivo contra el endpoint real de
// openai/gpt-oss-20b:free a través de varias llamadas — este modelo hace
// un "razonamiento" interno visible antes de emitir su salida JSON
// estructurada, y la latencia observada varió significativamente de
// llamada a llamada (~13s en un intento, todavía sin terminar a los 25s
// en otro). Tanto 10s como después 25s se abortaron antes de que
// terminara de descargarse la respuesta, descartando en silencio un
// resultado de triage que en realidad había sido exitoso (el AbortError
// cae en el mismo camino de no-op que cualquier otra falla, así que esto
// fue invisible hasta probarlo en vivo varias veces). 45s da margen real
// para la variabilidad de este modelo de nivel gratuito, mientras se
// mantiene bien dentro de los límites de ejecución de las Supabase Edge
// Functions.
const OPENROUTER_TIMEOUT_MS = 45_000

Deno.serve(async (req: Request) => {
  try {
    // ── 1. Verificar que quien llama presenta el secreto de trigger compartido ─────────
    const authHeader = req.headers.get('Authorization')
    const triggerSecret = Deno.env.get('AI_TRIAGE_TRIGGER_SECRET')

    if (!isAuthorizedCaller(authHeader, triggerSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Parsear el body del request ────────────────────────────────────────
    const body = (await req.json()) as { ticketId?: string }
    const ticketId = body?.ticketId

    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'Missing ticketId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // El triage en sí es best-effort y NUNCA debe exponer una falla a
    // quien haya llamado a esta función (el futuro trigger
    // fire-and-forget, o una invocación manual) — cualquier error en
    // cualquier punto de fetch/llamada a OpenRouter/parseo/validación
    // colapsa a un no-op silencioso más abajo.
    try {
      // ── 3. Obtener el ticket + la lista completa de categorías ──────────────────
      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from('tickets')
        .select('title, description')
        .eq('id', ticketId)
        .single()

      if (ticketError || !ticket) {
        throw new Error(`Failed to load ticket ${ticketId}: ${ticketError?.message ?? 'not found'}`)
      }

      const { data: categories, error: categoriesError } = await supabaseAdmin
        .from('categories')
        .select('id, name')

      if (categoriesError || !categories || categories.length === 0) {
        throw new Error(`Failed to load categories: ${categoriesError?.message ?? 'empty list'}`)
      }

      const categoryOptions = categories as CategoryOption[]
      const validCategoryIds = categoryOptions.map((c) => c.id)

      // ── 4. Llamar a OpenRouter con un timeout ───────────────────────────────
      const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
      if (!openRouterApiKey) {
        throw new Error('OPENROUTER_API_KEY is not configured')
      }

      const prompt = buildTriagePrompt({ title: ticket.title, description: ticket.description }, categoryOptions)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS)

      let openRouterJson: unknown
      try {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b:free',
            messages: [{ role: 'user', content: prompt }],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'ticket_triage',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    suggestedCategoryId: { type: 'string', enum: validCategoryIds },
                    suggestedPriority: { type: 'string', enum: ['baja', 'media', 'alta', 'critica'] },
                    suggestedResponse: { type: 'string' },
                    confidence: { type: 'number' },
                  },
                  required: ['suggestedCategoryId', 'suggestedPriority', 'suggestedResponse', 'confidence'],
                  additionalProperties: false,
                },
              },
            },
          }),
          signal: controller.signal,
        })

        if (!openRouterResponse.ok) {
          throw new Error(`OpenRouter responded with non-2xx status ${openRouterResponse.status}`)
        }

        openRouterJson = await openRouterResponse.json()
      } finally {
        clearTimeout(timeout)
      }

      // ── 5. Parsear + validar con zod el resultado estructurado ──────────────────
      const triageResult = parseOpenRouterChatCompletion(openRouterJson, validCategoryIds)

      if (!triageResult) {
        throw new Error('OpenRouter response failed parsing/validation — see parseOpenRouterChatCompletion')
      }

      // ── 6. Persistir solo si todo tuvo éxito ────────────────────────────────
      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({
          ai_triage: {
            ...triageResult,
            generatedAt: new Date().toISOString(),
          },
        })
        .eq('id', ticketId)

      if (updateError) {
        throw new Error(`Failed to persist ai_triage: ${updateError.message}`)
      }
    } catch (triageError) {
      // No-op silencioso: loguear del lado del servidor para poder
      // debuggear, no escribir nada, nunca reintentar, nunca exponer esta
      // falla a quien llamó.
      const message = triageError instanceof Error ? triageError.message : 'Unknown triage failure'
      console.error(`[ai-triage] Triage did not complete for ticket ${ticketId}: ${message}`)
    }

    // La llamada fire-and-forget en sí siempre "tiene éxito" desde el
    // punto de vista de quien llama, haya producido o no un resultado el
    // triage.
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // A este catch externo solo llegan errores verdaderamente inesperados
    // (body JSON inválido, env vars faltantes para el propio cliente
    // admin, etc.).
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
