// Edge Function: sla-escalation-check
// Invocada cada 15 minutos por un job de pg_cron (ver migración
// 20260701000008_sla_cron_schedule.sql). Ejecuta el RPC idempotente
// run_sla_escalation_check(), que escala cualquier ticket que haya
// incumplido su deadline de SLA (fuerza la prioridad a 'critica' y
// notifica a todos los admins activos).
//
// A diferencia de create-user, acá quien llama es el propio pg_cron (vía
// net.http_post), no un usuario final — no hay una sesión de Supabase
// Auth que verificar. En su lugar, quien llama debe presentar la propia
// service-role key del proyecto como bearer token, demostrando que es un
// caller confiable del lado del servidor (las Edge Functions son
// públicamente enrutables por defecto, así que este chequeo evita que
// llamadas HTTP públicas arbitrarias disparen el escalamiento).
//
// SECRETO REQUERIDO: SUPABASE_SERVICE_ROLE_KEY es auto-inyectada por
// Supabase en cada Edge Function desplegada — no hace falta configurar
// nada manualmente para esta función en sí. (El paso manual aparte es
// guardar esa misma key en Supabase Vault para que el job de pg_cron
// pueda enviarla como header Authorization — ver migración
// 20260701000008.)

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
