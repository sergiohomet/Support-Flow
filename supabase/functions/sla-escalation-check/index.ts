// Edge Function: sla-escalation-check
// Invoked every 15 minutes by a pg_cron job (see migration
// 20260701000008_sla_cron_schedule.sql). Runs the idempotent
// run_sla_escalation_check() RPC, which escalates any ticket that has
// breached its SLA deadline (forces priority to 'critica' and notifies
// all active admins).
//
// Unlike create-user, the caller here is pg_cron itself (via
// net.http_post), not an end user — there is no Supabase Auth session
// to verify. Instead, the caller must present the project's own
// service-role key as a bearer token, proving it is a trusted
// server-side caller (Edge Functions are publicly routable by default,
// so this check prevents arbitrary public HTTP calls from triggering
// escalation).
//
// REQUIRED SECRET: SUPABASE_SERVICE_ROLE_KEY is auto-injected by
// Supabase into every deployed Edge Function — no manual setup needed
// for this function itself. (The separate manual step is storing that
// same key in Supabase Vault so the pg_cron job can send it as the
// Authorization header — see migration 20260701000008.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey,
    )

    const { data, error } = await supabaseAdmin.rpc('run_sla_escalation_check')

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const escalatedCount = Array.isArray(data) && data.length > 0 ? data[0].escalated_count : 0

    return new Response(JSON.stringify({ ok: true, escalatedCount, tickets: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
