import { useState, useEffect } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const EDGE = `${SUPABASE_URL}/functions/v1`

const DAYS = ['PN.', 'WT.', 'ŚR.', 'CZ.', 'PT.', 'SOB.', 'NIEDZ.']

function getDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  if (isNaN(d)) return ''
  return DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors bg-white'

export default function AmazonForm({ authSession, authHeaders, fleetForForm, profile }) {
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    appointment_id: '',
    nr_leo: '',
    spedytor: '',
    // załadunek
    miasto_zal: '',
    fc_zal: '',
    kod_zal: '',
    data_zal: '',
    czas_zal: '',
    // rozładunek
    miasto_roz: '',
    fc_roz: '',
    kod_roz: '',
    data_roz: '',
    czas_roz: '',
    // finanse
    fracht: '',
    km: '',
  })

  useEffect(() => {
    if (profile?.inicjaly) setForm(p => ({ ...p, spedytor: p.spedytor || profile.inicjaly }))
  }, [profile])

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const parseKod = (kod) => {
        if (!kod) return { kraj: '', kod_pocz: '' }
        const m = kod.match(/^([A-Z]{2})(.+)$/)
        if (m) return { kraj: m[1], kod_pocz: m[2] }
        return { kraj: '', kod_pocz: kod }
      }

      const zalKod = parseKod(form.kod_zal)
      const rozKod = parseKod(form.kod_roz)

      const payload = {
        numer_zlecenia: form.appointment_id || null,
        spedytor: form.spedytor || null,
        nr_leo: form.nr_leo || null,
        rodzaj_zlecenia: 'AMAZON',
        is_amazon: true,
        cena_eur: parseFloat(form.fracht) || null,
        km: parseInt(form.km) || null,
        created_by: authSession?.user?.id || null,
        zaladunki: [{
          kolejnosc: 1,
          nazwa_firmy: form.fc_zal || null,
          miasto: form.miasto_zal || null,
          kod: zalKod.kod_pocz || null,
          kraj: zalKod.kraj || null,
          data: form.data_zal || null,
          okno_od: form.czas_zal || null,
          okno_do: null,
          ma_okno: !!form.czas_zal,
          nr_ref: form.appointment_id || null,
        }],
        rozladunki: [{
          kolejnosc: 1,
          nazwa_firmy: form.fc_roz || null,
          miasto: form.miasto_roz || null,
          kod: rozKod.kod_pocz || null,
          kraj: rozKod.kraj || null,
          data: form.data_roz || null,
          okno_od: form.czas_roz || null,
          okno_do: null,
          ma_okno: !!form.czas_roz,
          nr_ref: null,
        }],
      }

      const res = await fetch(`${EDGE}/save-zlecenie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Błąd zapisu')

      setSaved(data.vrid)
      setForm(p => ({
        appointment_id: '', nr_leo: '', spedytor: p.spedytor,
        miasto_zal: '', fc_zal: '', kod_zal: '', data_zal: '', czas_zal: '',
        miasto_roz: '', fc_roz: '', kod_roz: '', data_roz: '', czas_roz: '',
        fracht: '', km: '',
      }))
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  if (saved) return (
    <div className="max-w-lg mx-auto mt-20 text-center p-8 bg-green-50 border border-green-200 rounded-2xl shadow-sm">
      <div className="text-green-500 text-5xl mb-4">✓</div>
      <h2 className="text-xl font-bold text-green-800 mb-2">Zlecenie Amazon zapisane!</h2>
      <p className="font-mono font-bold text-green-700 text-lg mb-6">{saved}</p>
      <button onClick={() => setSaved(null)} className="px-6 py-2.5 bg-copper text-white rounded-xl font-bold text-sm hover:bg-copper/90 transition-colors">
        NOWE ZLECENIE
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wide">Amazon</span>
        <h2 className="text-xl font-bold text-gray-800">Nowe zlecenie</h2>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Nagłówek */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="VRID">
              <input className={inp} placeholder="np. 112DZCCT1" value={form.appointment_id}
                onChange={e => set('appointment_id', e.target.value)} required />
            </Field>
            <Field label="Nr LEO">
              <input className={inp} list="fleet-list-amazon" placeholder="LEO-xxx"
                value={form.nr_leo} onChange={e => set('nr_leo', e.target.value)} />
              <datalist id="fleet-list-amazon">
                {fleetForForm.map(v => <option key={v.nr_leo} value={v.nr_leo}>{v.marka}</option>)}
              </datalist>
            </Field>
          </div>
        </div>

        {/* Załadunek / Rozładunek */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ZAŁADUNEK */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">Załadunek</p>
            <div className="space-y-3">
              <Field label="Miejscowość">
                <input className={inp} placeholder="np. Graben" value={form.miasto_zal}
                  onChange={e => set('miasto_zal', e.target.value)} />
              </Field>
              <Field label="Magazyn / FC">
                <input className={inp} placeholder="np. MUC3" value={form.fc_zal}
                  onChange={e => set('fc_zal', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Kod (kraj+pocztowy)">
                <input className={inp} placeholder="np. DE86836" value={form.kod_zal}
                  onChange={e => set('kod_zal', e.target.value.toUpperCase())} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Data">
                  <input type="date" className={inp} value={form.data_zal}
                    onChange={e => set('data_zal', e.target.value)} />
                </Field>
                <Field label={`Godz.${form.data_zal ? ` (${getDay(form.data_zal)})` : ''}`}>
                  <input type="time" className={inp} value={form.czas_zal}
                    onChange={e => set('czas_zal', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {/* ROZŁADUNEK */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-3">Rozładunek</p>
            <div className="space-y-3">
              <Field label="Miejscowość">
                <input className={inp} placeholder="np. Klagenfurt" value={form.miasto_roz}
                  onChange={e => set('miasto_roz', e.target.value)} />
              </Field>
              <Field label="Magazyn / FC">
                <input className={inp} placeholder="np. DAP5" value={form.fc_roz}
                  onChange={e => set('fc_roz', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Kod (kraj+pocztowy)">
                <input className={inp} placeholder="np. AT9020" value={form.kod_roz}
                  onChange={e => set('kod_roz', e.target.value.toUpperCase())} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Data">
                  <input type="date" className={inp} value={form.data_roz}
                    onChange={e => set('data_roz', e.target.value)} />
                </Field>
                <Field label={`Godz.${form.data_roz ? ` (${getDay(form.data_roz)})` : ''}`}>
                  <input type="time" className={inp} value={form.czas_roz}
                    onChange={e => set('czas_roz', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

        </div>

        {/* Fracht + KM */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fracht (EUR)">
              <input type="number" step="0.01" className={inp} placeholder="np. 1072.67"
                value={form.fracht} onChange={e => set('fracht', e.target.value)} />
            </Field>
            <Field label="KM">
              <input type="number" className={inp} placeholder="np. 850"
                value={form.km} onChange={e => set('km', e.target.value)} />
            </Field>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-60 shadow-sm">
          {saving ? 'Zapisuję...' : 'ZAPISZ ZLECENIE AMAZON'}
        </button>

      </form>
    </div>
  )
}
