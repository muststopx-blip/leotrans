import { useState } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function ChangePassword({ session, onClose }) {
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (newPass.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków')
      return
    }
    if (newPass !== confirmPass) {
      setError('Hasła nie są identyczne')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
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
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-800">Zmień hasło</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="text-green-500 text-4xl mb-3">✓</div>
              <p className="text-sm font-semibold text-green-700 mb-1">Hasło zostało zmienione!</p>
              <p className="text-xs text-gray-500 mb-5">Przy następnym logowaniu użyj nowego hasła.</p>
              <button onClick={onClose} className="w-full py-2.5 bg-copper text-white rounded-xl text-sm font-bold hover:bg-copper/90 transition-colors">
                Zamknij
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nowe hasło
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Min. 8 znaków"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Powtórz hasło
                </label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Powtórz nowe hasło"
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-copper text-white rounded-xl text-sm font-bold hover:bg-copper/90 transition-colors disabled:opacity-60">
                  {loading ? 'Zmieniam...' : 'Zmień hasło'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </>
  )
}
