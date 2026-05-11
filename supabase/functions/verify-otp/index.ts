import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getUser(token: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': ANON_KEY },
  })
  if (!res.ok) return null
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Brak autoryzacji')

    const { code } = await req.json()
    if (!code || !/^\d{6}$/.test(code)) throw new Error('Nieprawidłowy format kodu')

    const token = authHeader.replace('Bearer ', '')
    const user = await getUser(token)
    if (!user?.id) throw new Error('Nieprawidłowy token')

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
    const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    const { data: record, error: dbErr } = await supabase
      .from('otp_codes')
      .select('id')
      .eq('user_id', user.id)
      .eq('code_hash', codeHash)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (dbErr || !record) throw new Error('Nieprawidłowy lub wygasły kod')

    await supabase.from('otp_codes').update({ used: true }).eq('id', record.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
