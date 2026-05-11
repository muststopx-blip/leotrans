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

    const token = authHeader.replace('Bearer ', '')
    const user = await getUser(token)
    if (!user?.id) throw new Error('Nieprawidłowy token')

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(otp))
    const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    await supabase.from('otp_codes').delete().eq('user_id', user.id)
    await supabase.from('otp_codes').insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.log(`[OTP DEV] ${user.email}: ${otp}`)
      return new Response(JSON.stringify({ success: true, dev_code: otp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'LEOTRANS <noreply@leo-trans.pl>',
        to: [user.email],
        subject: `${otp} – kod weryfikacyjny LEOTRANS`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:420px;margin:0 auto;padding:40px 20px;color:#111">
            <h1 style="color:#1a2744;font-size:22px;margin:0 0 4px">LEOTRANS</h1>
            <p style="color:#888;font-size:13px;margin:0 0 32px">System zarządzania zleceniami</p>
            <p style="margin:0 0 16px;color:#444">Twój kod weryfikacyjny do logowania:</p>
            <div style="background:#f4f4f5;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px">
              <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#1a2744;font-variant-numeric:tabular-nums">${otp}</span>
            </div>
            <p style="color:#aaa;font-size:12px;line-height:1.6">
              Kod jest ważny przez <strong>5 minut</strong>.<br>
              Jeśli to nie Ty próbujesz się zalogować, zignoruj tę wiadomość.
            </p>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      console.log(`[OTP RESEND FAIL] ${user.email}: ${otp}`)
    }

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
