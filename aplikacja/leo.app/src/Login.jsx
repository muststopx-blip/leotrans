import { useState } from 'react'
import logoImage from './logo.png'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function Login({ onDeviceVerified }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Forgot password
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.error || data.error_description) throw new Error('Nieprawidłowy email lub hasło')

      onDeviceVerified(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: forgotEmail }),
      })
      if (!res.ok) throw new Error('Nie udało się wysłać emaila')
      setForgotSent(true)
    } catch (err) {
      setForgotError(err.message)
    }
    setForgotLoading(false)
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

          {/* ── FORGOT PASSWORD ── */}
          {showForgot ? (
            <>
              <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotError(null) }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Wróć do logowania
              </button>

              {forgotSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-800 mb-1">Email wysłany!</p>
                  <p className="text-sm text-gray-500">Sprawdź skrzynkę <span className="font-medium text-gray-700">{forgotEmail}</span> i kliknij link do resetu hasła.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-gray-800 mb-1">Resetuj hasło</h2>
                  <p className="text-sm text-gray-500 mb-5">Wyślemy Ci link do ustawienia nowego hasła.</p>

                  {forgotError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{forgotError}</div>
                  )}

                  <form onSubmit={handleForgot} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
                      <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        className="input-field w-full" placeholder="jan@leo-trans.pl" required autoFocus />
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={forgotLoading}>
                      {forgotLoading ? 'Wysyłanie...' : 'WYŚLIJ LINK'}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (

          /* ── LOGIN ── */
            <>
              <h2 className="text-lg font-bold text-gray-800 mb-6">Zaloguj się</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input-field w-full" placeholder="jan@leo-trans.pl" required autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Hasło</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="input-field w-full" placeholder="••••••••" required />
                </div>
                <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                  {loading ? 'Logowanie...' : 'ZALOGUJ'}
                </button>
              </form>

              <button onClick={() => { setShowForgot(true); setForgotEmail(email) }}
                className="w-full text-xs text-gray-400 hover:text-copper transition-colors mt-4 py-1">
                Zapomniałem hasła
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
