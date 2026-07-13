// Edge Function: ai-triage
//
// PR2 of the "ai-triage" change. Given a ticketId, fetches the ticket and
// the full category list, asks Gemini for a structured triage suggestion
// (category, priority, first-response draft, confidence), and — only on
// full success — writes the validated result to tickets.ai_triage.
//
// Standalone/manually-invocable for now: nothing calls this function
// automatically yet. PR3 adds the AFTER INSERT trigger that invokes it
// on every new ticket; PR4/PR5 add the frontend UI to accept/reject the
// suggestion. This function does not depend on the trigger existing.
//
// AUTH: mirrors the shared-secret pattern used by sla-escalation-check,
// but with its OWN dedicated secret (AI_TRIAGE_TRIGGER_SECRET) rather
// than reusing SUPABASE_SERVICE_ROLE_KEY — see the PR description for why
// (this repo already hit a real incident, documented in migration
// 20260701000009, where a Vault-stored copy of a secret drifted out of
// sync with the value Supabase auto-injects; giving ai-triage its own
// single-purpose secret with a single source of truth avoids that class
// of bug entirely).
//
// REQUIRED SECRETS (see PR description for the exact live commands
// needed — none of these can be set from this repo):
//   - AI_TRIAGE_TRIGGER_SECRET: shared secret the (future, PR3) DB
//     trigger presents as `Authorization: Bearer <secret>`. Also stored
//     in Supabase Vault (as 'ai_triage_trigger_secret') so PR3's trigger
//     can read it via `vault.decrypted_secrets` the same way the SLA cron
//     job does (see migration 20260701000008).
//   - GEMINI_API_KEY: function-only, read directly via Deno.env.get, no
//     Vault copy — nothing else in this project ever needs it.
//   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: auto-injected by Supabase
//     into every deployed Edge Function, same as the other two functions
//     in this repo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildTriagePrompt,
  isAuthorizedCaller,
  parseTriageInteractionResponse,
  type CategoryOption,
} from './triage-logic.ts'

const GEMINI_TIMEOUT_MS = 10_000

Deno.serve(async (req: Request) => {
  try {
    // ── 1. Verify the caller presents the shared trigger secret ─────────
    const authHeader = req.headers.get('Authorization')
    const triggerSecret = Deno.env.get('AI_TRIAGE_TRIGGER_SECRET')

    if (!isAuthorizedCaller(authHeader, triggerSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Parse the request body ────────────────────────────────────────
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

    // Triage itself is best-effort and must NEVER surface a failure to
    // whoever called this function (the future fire-and-forget trigger,
    // or a manual invocation) — any error anywhere in fetch/Gemini
    // call/parse/validate collapses to a silent no-op below.
    try {
      // ── 3. Fetch the ticket + the full category list ──────────────────
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

      // ── 4. Call Gemini with a timeout ──────────────────────────────────
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY is not configured')
      }

      const prompt = buildTriagePrompt({ title: ticket.title, description: ticket.description }, categoryOptions)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

      let geminiJson: unknown
      try {
        const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: {
            'x-goog-api-key': geminiApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-3.5-flash',
            input: prompt,
            response_format: {
              type: 'text',
              mime_type: 'application/json',
              schema: {
                type: 'object',
                properties: {
                  suggestedCategoryId: { type: 'string', enum: validCategoryIds },
                  suggestedPriority: { type: 'string', enum: ['baja', 'media', 'alta', 'critica'] },
                  suggestedResponse: { type: 'string' },
                  confidence: { type: 'number' },
                },
                required: ['suggestedCategoryId', 'suggestedPriority', 'suggestedResponse', 'confidence'],
              },
            },
          }),
          signal: controller.signal,
        })

        if (!geminiResponse.ok) {
          throw new Error(`Gemini responded with non-2xx status ${geminiResponse.status}`)
        }

        geminiJson = await geminiResponse.json()
      } finally {
        clearTimeout(timeout)
      }

      const interaction = geminiJson as { status?: string }
      if (interaction?.status !== 'completed') {
        throw new Error(`Gemini interaction status was not 'completed': ${String(interaction?.status)}`)
      }

      // ── 5. Parse + zod-validate the structured result ──────────────────
      const triageResult = parseTriageInteractionResponse(geminiJson, validCategoryIds)

      if (!triageResult) {
        throw new Error('Gemini response failed parsing/validation — see parseTriageInteractionResponse')
      }

      // ── 6. Persist on full success only ────────────────────────────────
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
      // Silent no-op: log server-side for debuggability, write nothing,
      // never retry, never surface this failure to the caller.
      const message = triageError instanceof Error ? triageError.message : 'Unknown triage failure'
      console.error(`[ai-triage] Triage did not complete for ticket ${ticketId}: ${message}`)
    }

    // The fire-and-forget call itself always "succeeds" from the
    // caller's point of view, whether or not triage produced a result.
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    // Only truly unexpected errors (bad JSON body, missing env vars for
    // the admin client itself, etc.) reach this outer catch.
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
