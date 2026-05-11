import { useState } from 'react'
import logoImage from './logo.png'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function ResetPassword({ recoveryToken, onDone }) {
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (newPass.length < 8) { setError('Hasło musi mieć co najmniej 8 znaków'); return }
    if (newPass !== confirmPass) { setError('Hasła nie są identyczne'); return }

    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${recoveryToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ password: newPass }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'Błąd zmiany hasła')
      setSuccess(true)
    } catch (err) {
      setError(err.message)
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
          {success ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-gray-800 mb-1">Hasło zmienione!</p>
              <p className="text-sm text-gray-500 mb-6">Możesz się teraz zalogować nowym hasłem.</p>
              <button onClick={onDone} className="btn-primary w-full">ZALOGUJ SIĘ</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-copper/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-copper" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Nowe hasło</h2>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Nowe hasło</label>
                  <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                    className="input-field w-full" placeholder="Min. 8 znaków" required autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Powtórz hasło</label>
                  <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    className="input-field w-full" placeholder="Powtórz nowe hasło" required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Zapisuję...' : 'USTAW NOWE HASŁO'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
