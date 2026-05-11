import { useState, useRef, useEffect } from 'react'
import logoImage from './logo.png'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const EDGE = `${SUPABASE_URL}/functions/v1`

const DEVICE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 dni

export default function OtpVerify({ session, onVerified, onBack }) {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(true)
  const [error, setError] = useState(null)
  const [devCode, setDevCode] = useState(null)
  const [rememberDevice, setRememberDevice] = useState(false)
  const inputRefs = useRef([])

  const authHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${session?.access_token}`,
  }

  useEffect(() => { sendOtp() }, [])

  const sendOtp = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`${EDGE}/send-otp`, {
        method: 'POST',
        headers: authHeaders,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Błąd wysyłki kodu')
      if (data.dev_code) setDevCode(data.dev_code)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError('Nie udało się wysłać kodu. ' + err.message)
    }
    setSending(false)
  }

  const handleDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[index] = digit
    setCode(next)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
    if (next.every(d => d !== '')) verifyCode(next.join(''))
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (digits.length === 6) {
      setCode(digits.split(''))
      verifyCode(digits)
    }
  }

  const verifyCode = async (fullCode) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${EDGE}/verify-otp`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Nieprawidłowy lub wygasły kod')

      // Zapamiętaj urządzenie jeśli zaznaczono
      if (rememberDevice && session?.user?.email) {
        localStorage.setItem(`leo_device_${session.user.email}`, JSON.stringify({
          expires: Date.now() + DEVICE_TTL,
        }))
      }

      onVerified(session)
    } catch (err) {
      setError(err.message)
      setCode(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <img src={logoImage} alt="LEOTRANS" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">LEOTRANS</h1>
          <p className="text-xs text-gray-400 mt-1">Powered by Mediafy</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-copper/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">Weryfikacja dwuetapowa</h2>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            {sending
              ? 'Wysyłanie kodu...'
              : <>Kod wysłany na <span className="font-medium text-gray-700">{session?.user?.email}</span>. Wpisz 6-cyfrowy kod.</>
            }
          </p>

          {devCode && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-xs text-amber-600 mb-1">DEV — domena niezweryfikowana, kod:</p>
              <p className="text-2xl font-bold tracking-widest text-amber-800">{devCode}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading || sending}
                className="w-11 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-copper focus:ring-2 focus:ring-copper/20 transition-colors disabled:opacity-40 bg-gray-50 focus:bg-white"
              />
            ))}
          </div>

          {(loading || sending) && (
            <div className="flex justify-center mb-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-copper"></div>
            </div>
          )}

          {/* Zapamiętaj urządzenie */}
          <label className="flex items-center gap-2.5 cursor-pointer group mb-4 px-1">
            <div onClick={() => setRememberDevice(p => !p)}
              className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                rememberDevice ? 'bg-navy border-navy' : 'border-gray-300 group-hover:border-gray-400'
              }`}>
              {rememberDevice && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-xs text-gray-600 leading-tight">
              Zapamiętaj to urządzenie przez <span className="font-semibold text-gray-800">30 dni</span>
              <br />
              <span className="text-gray-400">Nie pytaj o kod przy kolejnym logowaniu</span>
            </span>
          </label>

          <div className="space-y-2 border-t border-gray-100 pt-3">
            <button onClick={sendOtp} disabled={loading || sending}
              className="w-full text-xs text-gray-400 hover:text-copper transition-colors disabled:opacity-40 py-1">
              Wyślij kod ponownie
            </button>
            <button onClick={onBack}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
              ← Wróć do logowania
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Kod ważny przez 5 minut</p>
      </div>
    </div>
  )
}
