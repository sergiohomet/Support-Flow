// Edge Function: create-user
// Crea un usuario nuevo vía la Auth admin API de Supabase, y después
// parchea el role/category porque el trigger handle_new_user setea
// role='client' por defecto.
//
// SECRETO REQUERIDO: SUPABASE_SERVICE_ROLE_KEY debe estar configurado en
// el proyecto de Supabase antes de desplegar esta función.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Manejar el preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Verificar que quien llama está autenticado ────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente con service role — bypassea RLS para operaciones admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Cliente de quien llama — respeta RLS, se usa para verificar la identidad de quien llama
    const supabaseCaller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    // Obtener la identidad del usuario que llama
    const { data: { user: callerUser }, error: callerError } = await supabaseCaller.auth.getUser()
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Verificar que quien llama es admin ────────────────────────────────────────────
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: caller is not an admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Parsear y validar el body del request ──────────────────────────────────
    const body = await req.json() as {
      fullName: string
      email: string
      temporaryPassword: string
      role: 'agent' | 'admin'
      categoryId: string | null
    }

    const { fullName, email, temporaryPassword, role, categoryId } = body

    if (!fullName || !email || !temporaryPassword || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['agent', 'admin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role. Must be agent or admin.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (role === 'agent' && !categoryId) {
      return new Response(JSON.stringify({ error: 'categoryId is required when role is agent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 4. Crear el usuario en auth ──────────────────────────────────────────────────
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      user_metadata: { full_name: fullName },
      email_confirm: true,
    })

    if (createError || !newAuthUser?.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'Failed to create user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = newAuthUser.user.id

    // ── 5. Parchear role + category ─────────────────────────────────────────────
    // El trigger handle_new_user crea la fila de public.users con
    // role='client'. Inmediatamente la sobrescribimos con el role y la
    // category deseados.
    const { error: patchError } = await supabaseAdmin
      .from('users')
      .update({
        role,
        category_id: role === 'agent' ? categoryId : null,
      })
      .eq('id', newUserId)

    if (patchError) {
      // El usuario se creó en auth pero falló la actualización del perfil — logueamos y de todas formas devolvemos userId
      console.error('Failed to patch user role/category:', patchError.message)
    }

    return new Response(JSON.stringify({ userId: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
