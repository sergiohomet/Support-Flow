// Edge Function: create-user
// Creates a new user via Supabase Auth admin API, then patches the role/category
// because handle_new_user trigger sets role='client' by default.
//
// REQUIRED SECRET: SUPABASE_SERVICE_ROLE_KEY must be set in the Supabase project
// before deploying this function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Verify the caller is authenticated ────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service role client — bypasses RLS for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Caller client — respects RLS, used to verify caller identity
    const supabaseCaller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    // Get the calling user's identity
    const { data: { user: callerUser }, error: callerError } = await supabaseCaller.auth.getUser()
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Verify caller is admin ────────────────────────────────────────────
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

    // ── 3. Parse and validate request body ──────────────────────────────────
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

    // ── 4. Create auth user ──────────────────────────────────────────────────
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

    // ── 5. Patch role + category ─────────────────────────────────────────────
    // handle_new_user trigger creates the public.users row with role='client'.
    // We immediately override with the intended role and category.
    const { error: patchError } = await supabaseAdmin
      .from('users')
      .update({
        role,
        category_id: role === 'agent' ? categoryId : null,
      })
      .eq('id', newUserId)

    if (patchError) {
      // User was created in auth but profile update failed — log and still return userId
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
