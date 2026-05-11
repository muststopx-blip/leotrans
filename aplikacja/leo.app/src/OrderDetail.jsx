import { useState, useEffect } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

function Badge({ children, color }) {
  const colors = {
    navy: 'bg-navy text-white',
    copper: 'bg-copper text-white',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    gray: 'bg-gray-100 text-gray-600',
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors[color] || colors.gray}`}>{children}</span>
}

function Row({ label, value, mono }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 uppercase font-semibold w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 font-medium break-words min-w-0 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function StopCard({ stop, type, index, total }) {
  const isZal = type === 'zal'
  const colors = isZal
    ? 'bg-green-50 border-green-100 text-green-700 bg-green-100'
    : 'bg-orange-50 border-orange-100 text-orange-700 bg-orange-100'
  const [bg, border, label, codeBg] = colors.split(' ')

  const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null
  const fmtTime = (t) => t ? String(t).substring(0, 5) : null

  return (
    <div className={`${bg} border ${border} rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-bold ${label} uppercase`}>
          {isZal ? 'Załadunek' : 'Rozładunek'}{total > 1 ? ` ${index + 1}` : ''}
        </span>
        {stop.kod && <span className={`font-mono text-xs ${codeBg} ${label} px-2 py-0.5 rounded`}>{stop.kod}</span>}
      </div>
      {stop.nazwa_firmy && <p className="text-sm font-semibold text-gray-800 mb-0.5">{stop.nazwa_firmy}</p>}
      {stop.ulica && <p className="text-sm text-gray-600">{stop.ulica}</p>}
      {(stop.miasto || stop.kraj) && (
        <p className="text-sm text-gray-600">{[stop.kod, stop.miasto, stop.kraj].filter(Boolean).join(', ')}</p>
      )}
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
        {stop.data && <span>{fmtDate(stop.data)}</span>}
        {stop.ma_okno && stop.okno_od && (
          <span>{fmtTime(stop.okno_od)}{stop.okno_do ? `–${fmtTime(stop.okno_do)}` : ''}</span>
        )}
        {stop.nr_ref && <span className="font-mono font-bold">{stop.nr_ref}</span>}
      </div>
      {stop.dodatkowe_info && <p className="text-xs text-gray-500 mt-1.5 italic">{stop.dodatkowe_info}</p>}
      {(stop.kontakt_imie || stop.kontakt_telefon) && (
        <div className="mt-2 pt-2 border-t border-current/10 flex gap-3 text-xs">
          {stop.kontakt_imie && <span className="font-semibold text-gray-700">{stop.kontakt_imie}</span>}
          {stop.kontakt_telefon && <a href={`tel:${stop.kontakt_telefon}`} className="font-mono underline">{stop.kontakt_telefon}</a>}
        </div>
      )}
    </div>
  )
}

function AiInsightsPanel({ text }) {
  const sections = []
  let current = null

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // NAGŁÓWEK SEKCJI — caps lock, bez myślnika
    if (/^[A-ZŁŚĆŹŻÓĄĘ\s\-–—]+$/.test(line) && line.length > 2 && !line.startsWith('—') && !line.startsWith('-')) {
      if (current) sections.push(current)
      current = { title: line, items: [] }
    } else if (line.startsWith('— ') || line.startsWith('- ')) {
      const content = line.replace(/^[—\-]\s*/, '')
      if (!current) current = { title: '', items: [] }
      current.items.push(content)
    } else {
      if (!current) current = { title: '', items: [] }
      current.items.push(line)
    }
  }
  if (current) sections.push(current)

  const sectionColors = {
    'KONTRAHENT': 'border-l-navy',
    'TRASA': 'border-l-copper',
    'ŁADUNEK': 'border-l-amber-400',
    'ZAŁADUNEK': 'border-l-green-500',
    'ROZŁADUNEK': 'border-l-orange-500',
    'POJAZD': 'border-l-blue-500',
    'KIEROWCA': 'border-l-blue-500',
    'WYMAGANIA': 'border-l-red-500',
    'PALETY': 'border-l-purple-500',
    'GRANICA': 'border-l-teal-500',
    'STAWKA': 'border-l-emerald-500',
    'NUMERY': 'border-l-gray-400',
  }

  const getColor = (title) => {
    const key = Object.keys(sectionColors).find(k => title.toUpperCase().includes(k))
    return key ? sectionColors[key] : 'border-l-gray-300'
  }

  if (!sections.length) {
    return <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-mono">{text}</pre>
  }

  return (
    <div className="space-y-3">
      {sections.map((section, si) => (
        <div key={si} className={`bg-white border border-gray-100 rounded-xl overflow-hidden border-l-4 ${getColor(section.title)} shadow-sm`}>
          {section.title && (
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{section.title}</span>
            </div>
          )}
          <div className="px-4 py-3 space-y-1.5">
            {section.items.map((item, ii) => (
              <div key={ii} className="flex gap-2 items-start">
                <span className="text-copper font-bold text-xs mt-0.5 flex-shrink-0">—</span>
                <span className="text-sm text-gray-700 leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OrderDetail({ order, onClose, onEdit, authHeaders }) {
  const [stops, setStops] = useState({ zaladunki: [], rozladunki: [] })
  const [tab, setTab] = useState('info')
  const [copied, setCopied] = useState(false)
  const [loadingStops, setLoadingStops] = useState(true)

  const fmtDate = (d) => {
    if (!d) return '—'
    const s = String(d).substring(0, 10)
    const [y, m, day] = s.split('-')
    return `${day}.${m}.${y}`
  }

  useEffect(() => {
    if (!order?.id) return
    setLoadingStops(true)
    Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/zaladunki?zlecenie_id=eq.${order.id}&order=kolejnosc`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/rozladunki?zlecenie_id=eq.${order.id}&order=kolejnosc`, { headers: authHeaders }).then(r => r.json()),
    ])
      .then(([zals, rozs]) => setStops({ zaladunki: Array.isArray(zals) ? zals : [], rozladunki: Array.isArray(rozs) ? rozs : [] }))
      .catch(() => {})
      .finally(() => setLoadingStops(false))
  }, [order?.id])

  const copyMsg = () => {
    navigator.clipboard.writeText(order.wiadomosc_dla_kierowcy || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusStyle = {
    nowe: 'bg-blue-100 text-blue-700',
    w_trasie: 'bg-amber-100 text-amber-700',
    zakonczone: 'bg-green-100 text-green-700',
    anulowane: 'bg-red-100 text-red-700',
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel - full screen on mobile, near-full on desktop */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[90vw] lg:w-[85vw] max-w-[1400px] bg-white z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-navy text-white flex-shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-center">
            <div className="font-mono font-bold text-copper text-sm">{order.vrid}</div>
            <div className="text-xs text-gray-400">{fmtDate(order.created_at)}</div>
          </div>
          <button onClick={() => { onClose(); onEdit(order) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-copper rounded-lg text-xs font-bold hover:bg-copper/90 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edytuj
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          {[
            ['info', 'Zlecenie'],
            ['ai', 'Analiza AI'],
            ['msg', 'Wiadomość'],
            ['pdf', order.pdf_url ? 'PDF' : 'PDF (brak)'],
          ].map(([key, label]) => (
            <button key={key}
              onClick={() => order.pdf_url || key !== 'pdf' ? setTab(key) : null}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === key
                  ? 'text-copper border-b-2 border-copper bg-white'
                  : !order.pdf_url && key === 'pdf'
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-700'
              }`}>
              {key === 'ai' && order.enrichment_status === 'processing'
                ? <span className="flex items-center justify-center gap-1">{label} <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" /></span>
                : label}
            </button>
          ))}
        </div>

        {/* ── INFO ── */}
        {tab === 'info' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {order.nr_leo && <Badge color="navy">{order.nr_leo}</Badge>}
              {order.status && <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusStyle[order.status] || 'bg-gray-100 text-gray-600'}`}>{order.status.replace('_', ' ').toUpperCase()}</span>}
              {order.rodzaj_zlecenia && <Badge color="gray">{order.rodzaj_zlecenia}</Badge>}
              {order.is_amazon && <Badge color="amber">AMAZON</Badge>}
              {order.adr && <Badge color="red">ADR</Badge>}
              {order.lift && <Badge color="purple">LIFT</Badge>}
              {order.palety_wymiana && <Badge color="blue">PALETY</Badge>}
            </div>

            {/* POD Link — wyróżniony jeśli istnieje */}
            {order.pod_link && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-blue-700 uppercase flex-shrink-0">Link POD</span>
                <a href={order.pod_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline font-mono truncate min-w-0 flex-1">{order.pod_link}</a>
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            )}

            {/* Dane podstawowe */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Dane podstawowe</p>
              <Row label="Kontrahent" value={order.kontrahent_nazwa} />
              <Row label="Spedytor" value={order.spedytor_imie || order.spedytor} />
              <Row label="Nr LEO" value={order.nr_leo} />
              <Row label="Pojazd" value={order.pojazd_marka || order.pojazd_typ} />
              <Row label="Rejestracja" value={order.pojazd_rejestracja} mono />
              <Row label="Fracht" value={order.cena_eur ? `${Number(order.cena_eur).toFixed(2)} €` : null} />
              <Row label="Km" value={order.km ? `${order.km} km` : null} />
            </div>

            {/* Kontakt kontrahenta */}
            {(order.kontrahent_email || order.kontrahent_telefon) && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Kontakt kontrahenta</p>
                {order.kontrahent_email && (
                  <div className="flex gap-2 py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-400 uppercase font-semibold w-28 flex-shrink-0 pt-0.5">Email</span>
                    <a href={`mailto:${order.kontrahent_email}`} className="text-sm text-blue-600 underline font-medium break-all">{order.kontrahent_email}</a>
                  </div>
                )}
                {order.kontrahent_telefon && (
                  <div className="flex gap-2 py-2">
                    <span className="text-xs text-gray-400 uppercase font-semibold w-28 flex-shrink-0 pt-0.5">Telefon</span>
                    <a href={`tel:${order.kontrahent_telefon}`} className="text-sm text-blue-600 underline font-medium">{order.kontrahent_telefon}</a>
                  </div>
                )}
              </div>
            )}

            {/* Załadunki */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Załadunki</p>
              {loadingStops ? (
                <div className="h-16 flex items-center justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-copper" /></div>
              ) : stops.zaladunki.length > 0 ? (
                <div className="space-y-2">
                  {stops.zaladunki.map((z, i) => <StopCard key={z.id} stop={z} type="zal" index={i} total={stops.zaladunki.length} />)}
                </div>
              ) : order.zaladunek_kod ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-sm font-mono text-green-700">{order.zaladunek_kod} {order.zaladunek_miasto}</p>
                  <p className="text-xs text-gray-500 mt-1">📅 {fmtDate(order.data_zal)}</p>
                </div>
              ) : <p className="text-sm text-gray-400 italic">Brak danych</p>}
            </div>

            {/* Rozładunki */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rozładunki</p>
              {loadingStops ? null : stops.rozladunki.length > 0 ? (
                <div className="space-y-2">
                  {stops.rozladunki.map((r, i) => <StopCard key={r.id} stop={r} type="roz" index={i} total={stops.rozladunki.length} />)}
                </div>
              ) : order.rozladunek_kod ? (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <p className="text-sm font-mono text-orange-700">{order.rozladunek_kod} {order.rozladunek_miasto}</p>
                  <p className="text-xs text-gray-500 mt-1">📅 {fmtDate(order.data_roz)}</p>
                </div>
              ) : <p className="text-sm text-gray-400 italic">Brak danych</p>}
            </div>

            {/* Ładunek */}
            {(order.ladunek_typ || order.ladunek_waga) && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ładunek</p>
                <Row label="Typ" value={order.ladunek_typ} />
                <Row label="Waga" value={order.ladunek_waga} />
              </div>
            )}
          </div>
        )}

        {/* ── ANALIZA AI ── */}
        {tab === 'ai' && (
          <div className="flex-1 overflow-y-auto p-4">
            {order.enrichment_status === 'processing' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full border-4 border-copper/20 border-t-copper animate-spin mb-4" />
                <p className="text-sm font-semibold text-gray-700 mb-1">Analiza w toku...</p>
                <p className="text-xs text-gray-400">Gemini analizuje zlecenie. Może potrwać do 60 sekund.</p>
              </div>
            )}
            {order.enrichment_status === 'error' && !order.ai_insights && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-sm text-red-700 font-semibold mb-1">Błąd analizy</p>
                <p className="text-xs text-red-500">Spróbuj ponownie później.</p>
              </div>
            )}
            {order.enrichment_status === 'pending' && !order.ai_insights && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400">Analiza zostanie uruchomiona po zapisaniu zlecenia.</p>
              </div>
            )}
            {order.ai_insights && (
              <AiInsightsPanel text={order.ai_insights} />
            )}
          </div>
        )}

        {/* ── WIADOMOŚĆ ── */}
        {tab === 'msg' && (
          <div className="flex-1 flex flex-col p-4 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700">Wiadomość dla kierowcy</p>
              <button onClick={copyMsg}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-copper text-white hover:bg-copper/90'
                }`}>
                {copied ? '✓ Skopiowano!' : 'Kopiuj'}
              </button>
            </div>
            <div className="flex-1 bg-gray-900 rounded-xl p-4 overflow-y-auto">
              <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap leading-relaxed">
                {order.wiadomosc_dla_kierowcy || 'Brak wiadomości dla kierowcy'}
              </pre>
            </div>
          </div>
        )}

        {/* ── PDF ── */}
        {tab === 'pdf' && order.pdf_url && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <span className="text-xs text-gray-500 truncate max-w-[200px]">Zlecenie PDF</span>
              <a href={order.pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white rounded-lg text-xs font-bold hover:bg-navy/90 transition-colors flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Otwórz zewnętrznie
              </a>
            </div>

            {/* iOS hint */}
            <div className="md:hidden px-4 py-2 bg-amber-50 border-b border-amber-100 flex-shrink-0">
              <p className="text-xs text-amber-700">Na iOS kliknij <strong>Otwórz zewnętrznie</strong> aby zobaczyć PDF</p>
            </div>

            {/* PDF iframe */}
            <div className="flex-1 overflow-auto bg-gray-200" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y pinch-zoom' }}>
              <iframe
                src={order.pdf_url}
                title="Zlecenie PDF"
                className="w-full border-0"
                style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}
              />
            </div>
          </div>
        )}

      </div>
    </>
  )
}
