import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ error: 'Usuário não autenticado.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Sessão inválida.' }, 401)

    const payload = await request.json()
    const poolId = String(payload.poolId ?? '')
    const email = String(payload.email ?? '').trim().toLowerCase()
    if (!poolId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Informe um e-mail válido.' }, 400)
    }

    const { data: pool, error: poolError } = await userClient
      .from('betting_pools').select('id, name').eq('id', poolId).single()
    if (poolError || !pool) return json({ error: 'Bolão não encontrado ou sem permissão.' }, 403)

    const { data: existing } = await userClient
      .from('betting_pool_invitations').select('id')
      .eq('betting_pool_id', poolId).eq('invited_email', email)
      .eq('status', 'pending').maybeSingle()

    let invitationId = existing?.id
    if (!invitationId) {
      const { data: invitation, error: invitationError } = await userClient
        .from('betting_pool_invitations')
        .insert({ betting_pool_id: poolId, invited_by: user.id, invited_email: email, role: 'member' })
        .select('id').single()
      if (invitationError) return json({ error: invitationError.message }, 400)
      invitationId = invitation.id
    }

    const configuredUrl = Deno.env.get('PUBLIC_APP_URL')?.replace(/\/$/, '')
    const requestOrigin = request.headers.get('origin')?.replace(/\/$/, '')
    const appUrl = configuredUrl || requestOrigin
    if (!appUrl) return json({ error: 'PUBLIC_APP_URL não foi configurada.' }, 500)

    const mailClient = createClient(supabaseUrl, anonKey)
    const { error: mailError } = await mailClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${appUrl}/convite?pool=${encodeURIComponent(poolId)}`,
        data: { pool_id: poolId, pool_name: pool.name, invitation_id: invitationId },
      },
    })
    if (mailError) {
      return json({ error: `Convite salvo, mas o e-mail não foi enviado: ${mailError.message}` }, 502)
    }

    return json({ sent: true, invitationId })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado.' }, 500)
  }
})
