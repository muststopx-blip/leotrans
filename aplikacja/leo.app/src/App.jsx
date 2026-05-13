import { useState, useEffect } from 'react'
import './index.css'
import logoImage from './logo.png'
import Login from './Login'
import ResetPassword from './ResetPassword'
import OrderDetail from './OrderDetail'
import ChangePassword from './ChangePassword'
import { exportSpedaXls } from './spedaExport'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const EDGE = `${SUPABASE_URL}/functions/v1`
const DB_HEADERS = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }

function parseDisplayDate(str) {
  if (!str) return ''
  const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return ''
}

const emptyZal = (id) => ({ id, nazwa_firmy: '', ulica: '', kod: '', miasto: '', kraj: 'Niemcy', data: '', oknoOd: '', oknoDo: '', maOkno: false, nr_ref: '', kontakt_imie: '', kontakt_telefon: '', dodatkowe_info: '' })

function App() {
  // --- AUTH ---
  // 'loading' | 'login' | 'app' | 'reset_password'
  const [authState, setAuthState] = useState('loading')
  const [authSession, setAuthSession] = useState(null)
  const [recoveryToken, setRecoveryToken] = useState(null)

  useEffect(() => {
    // Sprawdź URL hash — Supabase wkleja tu token po kliknięciu linku reset hasła
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.replace('#', '?'))
      const token = params.get('access_token')
      if (token) {
        setRecoveryToken(token)
        setAuthState('reset_password')
        window.history.replaceState(null, '', window.location.pathname)
        return
      }
    }

    try {
      const raw = localStorage.getItem('leo_session')
      if (raw) {
        const session = JSON.parse(raw)
        const payload = JSON.parse(atob(session.access_token.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          setAuthSession(session)
          setAuthState('app')
          return
        }
      }
    } catch {}
    setAuthState('login')
  }, [])

  const handleDeviceVerified = (session) => {
    localStorage.setItem('leo_session', JSON.stringify(session))
    setAuthSession(session)
    setAuthState('app')
  }

  const handleLogout = () => {
    localStorage.removeItem('leo_session')
    setAuthSession(null)
    setAuthState('login')
  }

  // Nagłówki z tokenem zalogowanego użytkownika
  const authHeaders = authSession
    ? { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${authSession.access_token}` }
    : DB_HEADERS

  const [profile, setProfile] = useState(null)
  const [rodzajSpedytora, setRodzajSpedytora] = useState('solo')

  useEffect(() => {
    if (authState !== 'app' || !authSession) return
    fetch(
      `${SUPABASE_URL}/rest/v1/profile?id=eq.${authSession.user.id}&select=*,stoly(id,nazwa,skrot)&limit=1`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${authSession.access_token}` } }
    )
      .then(r => r.json())
      .then(d => {
        const p = Array.isArray(d) ? d[0] : null
        setProfile(p)
        const emailName = authSession?.user?.email?.split('@')[0] || ''
        const sped = p?.inicjaly || emailName
        if (sped) setFormData(prev => ({ ...prev, spedytor: sped }))
      })
      .catch(() => {})
  }, [authState])

  useEffect(() => {
    if (!profile) return
    const emailName = authSession?.user?.email?.split('@')[0] || ''
    if (rodzajSpedytora === 'stol' && profile.stol_id) {
      setFormData(prev => ({ ...prev, spedytor: profile.stoly?.skrot || profile.stoly?.nazwa || profile.inicjaly || emailName }))
    } else {
      setFormData(prev => ({ ...prev, spedytor: profile.inicjaly || emailName }))
    }
  }, [rodzajSpedytora, profile])

  const [activeTab, setActiveTab] = useState('upload')
  const [newOrdersBadge, setNewOrdersBadge] = useState(0)
  const [toastVrid, setToastVrid] = useState(null)
  const [pdfUploaded, setPdfUploaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [submittedVrid, setSubmittedVrid] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [error, setError] = useState(null)

  // Historia
  const [orders, setOrders] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [dataOd, setDataOd] = useState('')
  const [dataDo, setDataDo] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  // Flota
  const [fleet, setFleet] = useState([])
  const [fleetForForm, setFleetForForm] = useState([])
  const [showAddFleet, setShowAddFleet] = useState(false)
  const [savingFleet, setSavingFleet] = useState(false)
  const [newFleet, setNewFleet] = useState({ nr_leo: '', typ: '', marka: '', rejestracja: '', rejestracja_naczepa: '', status: 'available' })

  // Checkboxy
  const [wylotGranica, setWylotGranica] = useState(false)
  const [powrotGranica, setPowrotGranica] = useState(false)
  const [paletyWymiana, setPaletyWymiana] = useState(false)
  const [adr, setAdr] = useState(false)
  const [lift, setLift] = useState(false)
  const [leoOpen, setLeoOpen] = useState(false)

  const [zaladunki, setZaladunki] = useState([emptyZal(1)])
  const [rozladunki, setRozladunki] = useState([emptyZal(1)])

  const [formData, setFormData] = useState({
    rodzajZlecenia: 'GIEŁDA',
    numer_zlecenia: '',
    kontrahent: '',
    kontrahent_id: null,
    kontrahentNip: '',
    kontrahentKraj: '',
    kontrahentKod: '',
    kontrahentMiasto: '',
    spedytor: '',
    nr_leo: '',
    cena_eur: '',
    km: '',
    numeryReferencyjne: '',
    ladunekTyp: '',
    ladunekTowar: '',
    kontrahentEmail: '',
    kontrahentTelefon: '',
    kontaktKlienta: '',
    kontaktTelefon: '',
    podLink: '',
    amazonSkad: '',
    amazonStatus: 'NOWE',
    wylotPrzejscie: 'Świecko',
    powrotPrzejscie: 'Świecko',
    paletyIlosc: '',
  })

  const [driverMessage, setDriverMessage] = useState('')

  // Pobierz flotę przy starcie (dla datalist w formularzu)
  useEffect(() => {
    if (!authSession) return
    fetch(`${SUPABASE_URL}/rest/v1/flota?select=nr_leo,typ,marka&order=nr_leo`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${authSession.access_token}` }
    })
      .then(r => r.json()).then(d => setFleetForForm(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [authSession])

  useEffect(() => {
    if (activeTab === 'history') fetchOrders()
    if (activeTab === 'fleet') fetchFleet()
  }, [activeTab])

  const fetchOrders = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/zlecenia_full?order=created_at.desc&limit=200`,
        { headers: authHeaders }
      )
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch { setOrders([]) }
    setLoadingHistory(false)
  }

  const fetchFleet = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/flota?select=*,kierowcy(imie_nazwisko,telefon)&order=nr_leo`,
        { headers: authHeaders }
      )
      const data = await res.json()
      setFleet(Array.isArray(data) ? data : [])
    } catch { setFleet([]) }
  }

  const autoExportSpeda = async (zlecenieId, vrid) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/zlecenia?id=eq.${zlecenieId}&select=*,kontrahenci(*),flota(*,kierowcy(*)),zaladunki(*),rozladunki(*)`,
        { headers: authHeaders }
      )
      const data = await res.json()
      if (Array.isArray(data) && data[0]) {
        const safeName = (vrid || 'SPEDA').replace(/\//g, '-')
        exportSpedaXls([data[0]], `SPEDA_${safeName}.xls`)
      }
    } catch {}
  }

  const handleEditOrder = (order) => {
    // TODO: otworzy formularz edycji z danymi zlecenia
    // Na razie placeholder
    alert(`Edycja zlecenia ${order.vrid} — wkrótce`)
  }

  // Generuj wiadomość dla kierowcy — tylko wartości, bez etykiet
  useEffect(() => {
    const isAmaz = formData.rodzajZlecenia === 'AMAZON' || formData.rodzajZlecenia === 'AMAZON PRYWATNE'
    let msg = ''

    if (isAmaz) {
      const header = [formData.numer_zlecenia, formData.spedytor, formData.amazonStatus].filter(Boolean)
      if (header.length) msg += header.join(' ') + '\n'

      const fmtStop = (z) => {
        const p = [z.miasto, z.nazwa_firmy, z.kod ? (krajCode(z.kraj) + z.kod) : ''].filter(Boolean)
        if (z.data) { try { p.push(DAY_PL[new Date(z.data + 'T12:00:00').getDay()].toUpperCase() + '.') } catch {} }
        if (z.oknoOd) p.push(z.oknoOd)
        if (z.data) { const [, m, d] = z.data.split('-'); if (m && d) p.push(`${d}.${m}`) }
        return p.join(' ')
      }
      zaladunki.forEach(z => { const s = fmtStop(z); if (s) msg += s + '\n' })
      rozladunki.forEach(r => { const s = fmtStop(r); if (s) msg += s + '\n' })
      if (formData.cena_eur) msg += formData.cena_eur

      setDriverMessage(msg.trim())
      return
    }

    if (formData.kontrahent) msg += `${formData.kontrahent}\n`

    zaladunki.forEach((z, i) => {
      msg += `\nZAŁADUNEK${zaladunki.length > 1 ? ' ' + (i + 1) : ''}\n`
      const timeStr = z.maOkno && z.oknoOd ? `  ${z.oknoOd}–${z.oknoDo}` : ''
      if (z.data) msg += `${z.data}${timeStr}\n`
      else if (timeStr) msg += `${timeStr.trim()}\n`
      if (z.ulica) msg += `${z.ulica}\n`
      if (z.kod || z.miasto) msg += `${[z.kod, z.miasto].filter(Boolean).join(' ')}${z.kraj ? '  ' + z.kraj : ''}\n`
      if (z.nr_ref) msg += `${z.nr_ref}\n`
      if (z.dodatkowe_info?.trim()) msg += `${z.dodatkowe_info.trim()}\n`
      const k = [z.kontakt_imie?.trim(), z.kontakt_telefon?.trim()].filter(Boolean)
      if (k.length) msg += `${k.join('  ')}\n`
    })

    rozladunki.forEach((r, i) => {
      msg += `\nROZŁADUNEK${rozladunki.length > 1 ? ' ' + (i + 1) : ''}\n`
      const timeStr = r.maOkno && r.oknoOd ? `  ${r.oknoOd}–${r.oknoDo}` : ''
      if (r.data) msg += `${r.data}${timeStr}\n`
      else if (timeStr) msg += `${timeStr.trim()}\n`
      if (r.ulica) msg += `${r.ulica}\n`
      if (r.kod || r.miasto) msg += `${[r.kod, r.miasto].filter(Boolean).join(' ')}${r.kraj ? '  ' + r.kraj : ''}\n`
      if (r.nr_ref) msg += `${r.nr_ref}\n`
      if (r.dodatkowe_info?.trim()) msg += `${r.dodatkowe_info.trim()}\n`
      const k = [r.kontakt_imie?.trim(), r.kontakt_telefon?.trim()].filter(Boolean)
      if (k.length) msg += `${k.join('  ')}\n`
    })

    const specjalne = []
    if (wylotGranica) specjalne.push(formData.wylotPrzejscie)
    if (powrotGranica) specjalne.push(formData.powrotPrzejscie)
    if (paletyWymiana && formData.paletyIlosc) specjalne.push(`${formData.paletyIlosc} palet wymiana`)
    if (adr) specjalne.push('ADR')
    if (lift) specjalne.push('WINDA')
    if (specjalne.length) msg += `\n${specjalne.join('  ')}\n`

    if (formData.ladunekTyp || formData.ladunekTowar) {
      msg += `\n${[formData.ladunekTyp, formData.ladunekTowar].filter(Boolean).join('  ')}\n`
    }
    if (formData.km) msg += `${formData.km} km`

    setDriverMessage(msg.trim())
  }, [formData, zaladunki, rozladunki, wylotGranica, powrotGranica, paletyWymiana, adr, lift])

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  // --- OCR ---
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsLoading(true)
    setError(null)

    try {
      const fd = new FormData()
      fd.append('pdf', file)

      const res = await fetch(`${EDGE}/ocr-zlecenie`, { method: 'POST', body: fd })
      const data = await res.json()

      if (!data.success) throw new Error(data.error || 'Błąd OCR')

      const ex = data.extracted || {}

      const emaileKontrahenta = Array.isArray(ex.zleceniodawca_emaile)
        ? ex.zleceniodawca_emaile.filter(e => e && !e.toLowerCase().includes('leo-trans')).join(', ')
        : (data.kontrahent_match?.email || '')

      const towarParts = [ex.waga, ex.wymiary, ex.ldm ? `LDM: ${ex.ldm}` : ''].filter(Boolean)
      setFormData(prev => ({
        ...prev,
        numer_zlecenia: ex.numer_zlecenia || '',
        kontrahent: ex.zleceniodawca_nazwa || '',
        kontrahent_id: data.kontrahent_match?.id || null,
        kontrahentNip: data.kontrahent_match?.nip || ex.zleceniodawca_nip || '',
        kontrahentKraj: data.kontrahent_match?.kraj || ex.zleceniodawca_kraj || '',
        kontrahentKod: data.kontrahent_match?.adres_kod || ex.zleceniodawca_kod || '',
        kontrahentMiasto: data.kontrahent_match?.adres_miasto || '',
        kontrahentEmail: emaileKontrahenta,
        kontrahentTelefon: ex.zleceniodawca_telefon || data.kontrahent_match?.telefon || '',
        cena_eur: ex.cena_eur?.toString() || '',
        ladunekTyp: ex.towar_opis || '',
        ladunekTowar: towarParts.join(' / '),
        podLink: ex.pod_link || '',
      }))

      setPdfUrl(data.pdf_url)

      if (ex.zaladunki?.length) {
        setZaladunki(ex.zaladunki.map((z, i) => ({
          id: i + 1,
          nazwa_firmy: z.nazwa_firmy || '',
          ulica: z.ulica || '',
          kod: z.kod || '',
          miasto: z.miasto || '',
          kraj: z.kraj || 'Niemcy',
          data: parseDisplayDate(z.data),
          oknoOd: z.okno_od || '',
          oknoDo: z.okno_do || '',
          maOkno: !!(z.okno_od && z.okno_do),
          nr_ref: z.nr_ref || '',
          kontakt_imie: z.kontakt_imie || '',
          kontakt_telefon: z.kontakt_telefon || '',
          dodatkowe_info: z.dodatkowe_info || '',
        })))
      }

      if (ex.rozladunki?.length) {
        setRozladunki(ex.rozladunki.map((r, i) => ({
          id: i + 1,
          nazwa_firmy: r.nazwa_firmy || '',
          ulica: r.ulica || '',
          kod: r.kod || '',
          miasto: r.miasto || '',
          kraj: r.kraj || 'Niemcy',
          data: parseDisplayDate(r.data),
          oknoOd: r.okno_od || '',
          oknoDo: r.okno_do || '',
          maOkno: !!(r.okno_od && r.okno_do),
          nr_ref: r.nr_ref || '',
          kontakt_imie: r.kontakt_imie || '',
          kontakt_telefon: r.kontakt_telefon || '',
          dodatkowe_info: r.dodatkowe_info || '',
        })))
      }

      if (ex.specjalne?.adr) setAdr(true)
      if (ex.specjalne?.palety_wymiana) setPaletyWymiana(true)

      setPdfUploaded(true)
    } catch (err) {
      setError(err.message)
    }
    setIsLoading(false)
  }

  // --- WYŚLIJ ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const payload = {
        numer_zlecenia: formData.numer_zlecenia || null,
        kontrahent_id: formData.kontrahent_id || null,
        kontrahent_nowy: !formData.kontrahent_id && formData.kontrahent
          ? {
              nazwa: formData.kontrahent,
              nip: formData.kontrahentNip || null,
              adres_kod: formData.kontrahentKod || null,
              adres_miasto: formData.kontrahentMiasto || null,
              kraj: formData.kontrahentKraj || null,
            } : undefined,
        spedytor: formData.spedytor || null,
        nr_leo: formData.nr_leo ? `LEO-${formData.nr_leo.padStart(3, '0')}` : null,
        rodzaj_zlecenia: formData.rodzajZlecenia,
        cena_eur: parseFloat(formData.cena_eur) || null,
        km: parseInt(formData.km) || null,
        pdf_url: pdfUrl || null,
        is_amazon: formData.rodzajZlecenia === 'AMAZON' || formData.rodzajZlecenia === 'AMAZON PRYWATNE',
        created_by: authSession?.user?.id || null,
        rodzaj_spedytora: rodzajSpedytora,
        stol_id: rodzajSpedytora === 'stol' ? (profile?.stol_id || null) : null,
        adr,
        lift,
        palety_wymiana: paletyWymiana,
        palety_ilosc: parseInt(formData.paletyIlosc) || null,
        wylot_granica: wylotGranica,
        wylot_przejscie: wylotGranica ? formData.wylotPrzejscie : null,
        powrot_granica: powrotGranica,
        powrot_przejscie: powrotGranica ? formData.powrotPrzejscie : null,
        ladunek_typ: formData.ladunekTyp || null,
        ladunek_waga: formData.ladunekTowar || null,
        numery_referencyjne: formData.numeryReferencyjne || null,
        pod_link: formData.podLink || null,
        kontrahent_email: formData.kontrahentEmail || null,
        kontrahent_telefon: formData.kontrahentTelefon || null,
        wiadomosc_dla_kierowcy: driverMessage || null,
        zaladunki: zaladunki.map((z, i) => ({
          kolejnosc: i + 1,
          nazwa_firmy: z.nazwa_firmy || null,
          ulica: z.ulica || null,
          kod: z.kod || null,
          miasto: z.miasto || null,
          kraj: z.kraj || 'Niemcy',
          data: z.data || null,
          okno_od: z.maOkno ? (z.oknoOd || null) : null,
          okno_do: z.maOkno ? (z.oknoDo || null) : null,
          ma_okno: z.maOkno,
          nr_ref: z.nr_ref || null,
          kontakt_imie: z.kontakt_imie || null,
          kontakt_telefon: z.kontakt_telefon || null,
          dodatkowe_info: z.dodatkowe_info || null,
        })),
        rozladunki: rozladunki.map((r, i) => ({
          kolejnosc: i + 1,
          nazwa_firmy: r.nazwa_firmy || null,
          ulica: r.ulica || null,
          kod: r.kod || null,
          miasto: r.miasto || null,
          kraj: r.kraj || 'Niemcy',
          data: r.data || null,
          okno_od: r.maOkno ? (r.oknoOd || null) : null,
          okno_do: r.maOkno ? (r.oknoDo || null) : null,
          ma_okno: r.maOkno,
          nr_ref: r.nr_ref || null,
          kontakt_imie: r.kontakt_imie || null,
          kontakt_telefon: r.kontakt_telefon || null,
          dodatkowe_info: r.dodatkowe_info || null,
        })),
      }

      const res = await fetch(`${EDGE}/save-zlecenie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Błąd zapisu')

      setToastVrid(data.vrid)
      setNewOrdersBadge(p => p + 1)
      if (data.id) autoExportSpeda(data.id, data.vrid)
      resetForm()
      fetchOrders()
      setTimeout(() => setToastVrid(null), 4000)
    } catch (err) {
      setError(err.message)
    }
    setIsSaving(false)
  }

  const resetForm = () => {
    setPdfUploaded(false)
    setPdfUrl(null)
    setWylotGranica(false)
    setPowrotGranica(false)
    setPaletyWymiana(false)
    setAdr(false)
    setLift(false)
    setZaladunki([emptyZal(1)])
    setRozladunki([emptyZal(1)])
    setFormData({
      rodzajZlecenia: 'GIEŁDA', numer_zlecenia: '', kontrahent: '', kontrahent_id: null,
      kontrahentKraj: '', kontrahentKod: '',
      spedytor: profile?.inicjaly || '', nr_leo: '', cena_eur: '', km: '', numeryReferencyjne: '',
      ladunekTyp: '', ladunekTowar: '',
      kontrahentEmail: '', kontrahentTelefon: '', kontaktKlienta: '', kontaktTelefon: '', podLink: '',
      amazonSkad: '', amazonStatus: 'NOWE', wylotPrzejscie: 'Świecko', powrotPrzejscie: 'Świecko', paletyIlosc: '',
    })
  }

  // Załadunki helpers
  const dodajZaladunek = () => setZaladunki(p => [...p, emptyZal(Date.now())])
  const usunZaladunek = (id) => { if (zaladunki.length > 1) setZaladunki(p => p.filter(z => z.id !== id)) }
  const updateZaladunek = (id, field, value) => setZaladunki(p => p.map(z => z.id === id ? { ...z, [field]: value } : z))

  // Rozładunki helpers
  const dodajRozladunek = () => setRozladunki(p => [...p, emptyZal(Date.now())])
  const usunRozladunek = (id) => { if (rozladunki.length > 1) setRozladunki(p => p.filter(r => r.id !== id)) }
  const updateRozladunek = (id, field, value) => setRozladunki(p => p.map(r => r.id === id ? { ...r, [field]: value } : r))

  // Historia sort/filter
  const handleSort = (key) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }))

  const filteredOrders = [...orders]
    .sort((a, b) => {
      if (!sortConfig.key) return 0
      const av = a[sortConfig.key], bv = b[sortConfig.key]
      return sortConfig.direction === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    .filter(o => {
      const s = searchQuery.toLowerCase()
      const match = !s || [o.nr_leo, o.kontrahent_nazwa, o.numer_zlecenia, o.zaladunek_kod, o.zaladunek_miasto, o.rozladunek_kod, o.rozladunek_miasto, o.vrid].some(v => v?.toLowerCase().includes(s))
      const d = new Date(o.data_zal)
      return match && (!dataOd || d >= new Date(dataOd)) && (!dataDo || d <= new Date(dataDo))
    })

  // Pomocnicze funkcje historii
  const KRAJ_CODES = { niemcy: 'DE', polska: 'PL', francja: 'FR', czechy: 'CZ', austria: 'AT', wlochy: 'IT', hiszpania: 'ES', slowacja: 'SK', wegry: 'HU', belgia: 'BE', holandia: 'NL', niderlandy: 'NL', szwecja: 'SE', dania: 'DK', norwegia: 'NO', finlandia: 'FI', szwajcaria: 'CH', rumunia: 'RO', bulgaria: 'BG' }
  const krajCode = (k) => { if (!k) return ''; const l = k.toLowerCase(); return KRAJ_CODES[l] || k.substring(0, 2).toUpperCase() }
  const DAY_PL = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob']
  const dayAbbr = (d) => { if (!d) return ''; try { return DAY_PL[new Date(d + 'T12:00:00').getDay()] } catch { return '' } }
  const shortDate = (d) => { if (!d) return ''; const s = String(d).substring(0, 10); const [, m, day] = s.split('-'); return `${day}.${m}` }
  const shortTime = (t) => { if (!t) return ''; return String(t).substring(0, 5) }
  const KRAJ_FROM_CODE = { DE: 'Niemcy', FR: 'Francja', PL: 'Polska', CZ: 'Czechy', AT: 'Austria', IT: 'Wlochy', ES: 'Hiszpania', SK: 'Slowacja', HU: 'Wegry', BE: 'Belgia', NL: 'Holandia', SE: 'Szwecja', DK: 'Dania', NO: 'Norwegia', FI: 'Finlandia', CH: 'Szwajcaria', RO: 'Rumunia', BG: 'Bulgaria' }
  const parseAmazonCode = (code) => {
    if (!code || code.length < 3) return { kraj: '', kod: code || '' }
    const prefix = code.substring(0, 2).toUpperCase()
    return { kraj: KRAJ_FROM_CODE[prefix] || '', kod: code.substring(2) }
  }

  // Koszty km wg typu pojazdu
  const getKosztKm = (typ) => {
    if (!typ) return null
    const t = typ.toLowerCase()
    if (t.includes('3.5') || t.includes('3,5')) return 0.77
    if (t.includes('7.5') || t.includes('7,5')) return 0.88
    return null
  }
  const calcProfit = (order) => {
    if (!order.cena_eur || !order.km || !order.nr_leo) return null
    const v = fleetForForm.find(f => f.nr_leo === order.nr_leo)
    if (!v) return null
    const rate = getKosztKm(v.typ)
    if (rate === null) return null
    return Number((order.cena_eur - order.km * rate).toFixed(2))
  }

  const multiStop = zaladunki.length > 1 || rozladunki.length > 1
  const isAmazonForm = formData.rodzajZlecenia === 'AMAZON' || formData.rodzajZlecenia === 'AMAZON PRYWATNE'
  const boxClass = `bg-white border border-gray-300 rounded-lg shadow-sm ${multiStop ? 'compact-box-small' : 'compact-box'}`
  const gridGap = multiStop ? 'gap-compact-small' : 'gap-compact'

  if (authState === 'loading') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
    </div>
  )
  if (authState === 'reset_password') return (
    <ResetPassword recoveryToken={recoveryToken} onDone={() => { setRecoveryToken(null); setAuthState('login') }} />
  )
  if (authState === 'login') return (
    <Login onDeviceVerified={handleDeviceVerified} />
  )

  return (
    <div className="flex h-screen bg-white">

      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed md:relative z-30 h-full w-64 bg-navy text-white flex flex-col flex-shrink-0
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5 border-b border-gray-700 flex flex-col items-center">
          <img src={logoImage} alt="LEOTRANS Logo" className="w-24 h-24 mb-2" />
          <h1 className="text-lg font-bold text-center">LEOTRANS</h1>
          <p className="text-xs text-gray-400 text-center mt-0.5">Powered by Mediafy</p>
        </div>
        <nav className="flex-1 p-4">
          {[
            ['upload',  '+ NOWE ZLECENIE'],
            ['history', 'HISTORIA'],
            ['fleet',   'FLOTA'],
          ].map(([tab, label]) => (
            <button key={tab}
              onClick={() => {
                setActiveTab(tab)
                setSidebarOpen(false)
                if (tab === 'history') setNewOrdersBadge(0)
              }}
              className={`w-full text-left px-4 py-3 rounded mb-2 transition font-semibold text-sm flex items-center justify-between ${activeTab === tab ? 'bg-copper text-white' : 'hover:bg-gray-800'}`}>
              <span>{label}</span>
              {tab === 'history' && newOrdersBadge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {newOrdersBadge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          {profile?.imie_nazwisko && <p className="text-sm font-semibold text-white truncate">{profile.imie_nazwisko}</p>}
          <p className="text-xs text-gray-400 truncate">{authSession?.user?.email}</p>
          {profile?.rola === 'admin' && <p className="text-xs text-copper font-semibold mt-0.5">Administrator</p>}
          <div className="flex gap-3 mt-1.5">
            <button onClick={() => setShowChangePassword(true)} className="text-xs text-gray-400 hover:text-white transition-colors">
              Zmień hasło
            </button>
            <span className="text-gray-600 text-xs">·</span>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white transition-colors">
              Wyloguj
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-auto bg-gray-50 min-w-0">

        {/* MOBILE TOPBAR */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-navy text-white sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-sm">
            {activeTab === 'upload' ? 'NOWE ZLECENIE' : activeTab === 'history' ? 'HISTORIA' : 'FLOTA'}
          </span>
        </div>

        {/* TOAST SUKCES */}
        {toastVrid && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-green-200 shadow-xl rounded-2xl px-5 py-4 animate-slide-in">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zapisano w historii</p>
              <p className="text-base font-mono font-bold text-copper leading-tight">{toastVrid}</p>
            </div>
            <button onClick={() => setToastVrid(null)} className="ml-2 text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
          </div>
        )}

        {/* WGRAJ ZLECENIE */}
        {activeTab === 'upload' && (
          <div className="p-4 md:p-6">

            {!submittedVrid && !pdfUploaded && (
              <div className="max-w-2xl mx-auto mt-20">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">NOWE ZLECENIE</h2>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

                {isLoading ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Gemini analizuje PDF...</p>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="h-2.5 rounded-full bg-copper animate-progress-bar"></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Ekstrakcja danych — kilka sekund</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-10 pt-10 pb-6">
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-copper transition-colors group">
                        <svg className="w-10 h-10 mx-auto mb-4 text-gray-300 group-hover:text-copper transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-base font-semibold text-gray-700 mb-1">Wgraj zlecenie PDF</p>
                        <p className="text-sm text-gray-400 mb-6">Przeciągnij plik tutaj lub kliknij aby wybrać</p>
                        <label className="btn-primary cursor-pointer inline-block">
                          WYBIERZ PLIK PDF
                          <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>
                    <div className="px-10 py-5 bg-gray-50 border-t border-gray-100 text-center">
                      <p className="text-xs text-gray-400 mb-3">lub kontynuuj bez pliku</p>
                      <button onClick={() => setPdfUploaded(true)} className="btn-secondary text-sm">DALEJ BEZ PDF</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!submittedVrid && pdfUploaded && (
              <div className="flex gap-6">
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-3 text-gray-800">ZLECENIE - SPRAWDŹ DANE</h2>
                  {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

                  <form onSubmit={handleSubmit} className={multiStop ? 'space-y-compact-small' : 'space-y-compact'}>

                    {/* Wiersz 1: rodzaj, spedytor, nr_leo, km */}
                    <div className={boxClass}>
                      {profile?.stol_id && (
                        <div className="mb-3">
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">ZLECENIE NA</label>
                          <div className="flex rounded-lg overflow-hidden border border-gray-300 w-64">
                            <button type="button"
                              className={`flex-1 py-2 text-xs font-bold uppercase transition ${rodzajSpedytora === 'solo' ? 'bg-navy text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                              onClick={() => setRodzajSpedytora('solo')}>
                              SOLO ({profile.inicjaly})
                            </button>
                            <button type="button"
                              className={`flex-1 py-2 text-xs font-bold uppercase transition ${rodzajSpedytora === 'stol' ? 'bg-copper text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                              onClick={() => setRodzajSpedytora('stol')}>
                              STÓŁ ({profile.stoly?.skrot || profile.stoly?.nazwa})
                            </button>
                          </div>
                        </div>
                      )}
                      <div className={`grid ${isAmazonForm ? 'grid-cols-3' : 'grid-cols-4'} ${gridGap}`}>
                        <div className="form-group">
                          <label>RODZAJ ZLECENIA</label>
                          <select className="input-field" value={formData.rodzajZlecenia} onChange={e => handleInputChange('rodzajZlecenia', e.target.value)}>
                            <option>GIEŁDA</option>
                            <option>KONTAKT</option>
                            <option>AMAZON</option>
                            <option>AMAZON PRYWATNE</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>SPEDYTOR</label>
                          <div className="input-field bg-gray-50 font-semibold text-gray-800 cursor-default select-none flex items-center h-[38px]">
                            {formData.spedytor || '—'}
                          </div>
                        </div>
                        <div className="form-group">
                          <label>NR LEO</label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="input-field font-mono tracking-wider"
                              placeholder="wpisz numer..."
                              maxLength={3}
                              value={formData.nr_leo}
                              autoComplete="off"
                              onChange={e => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 3)
                                handleInputChange('nr_leo', digits)
                                setLeoOpen(true)
                              }}
                              onFocus={() => setLeoOpen(true)}
                              onBlur={() => setTimeout(() => setLeoOpen(false), 150)}
                            />
                            {leoOpen && (() => {
                              const q = formData.nr_leo
                              const matches = fleetForForm.filter(v => !q || v.nr_leo.replace('LEO-', '').includes(q))
                              return matches.length > 0 ? (
                                <div className="absolute z-30 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                                  {matches.slice(0, 20).map(v => (
                                    <button key={v.nr_leo} type="button"
                                      onMouseDown={() => { handleInputChange('nr_leo', v.nr_leo.replace('LEO-', '')); setLeoOpen(false) }}
                                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0">
                                      <span className="font-mono font-bold text-navy">{v.nr_leo}</span>
                                      <span className="text-gray-400 truncate ml-2">{v.typ}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : null
                            })()}
                          </div>
                        </div>
                        {!isAmazonForm && (
                          <div className="form-group">
                            <label>KM</label>
                            <input type="text" inputMode="numeric" className="input-field" value={formData.km} onChange={e => handleInputChange('km', e.target.value)} />
                          </div>
                        )}
                      </div>
                    </div>

                    {isAmazonForm ? (<>

                      {/* Amazon: status chips + booking ID + cena */}
                      <div className={boxClass}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-amber-400 text-white text-xs font-bold rounded uppercase">Amazon</span>
                          {['NOWE', 'AKTUALIZACJA', 'ANULOWANIE'].map(s => (
                            <button key={s} type="button"
                              onClick={() => handleInputChange('amazonStatus', s)}
                              className={`px-3 py-1 text-xs font-bold rounded transition ${formData.amazonStatus === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                        <div className={`grid grid-cols-2 ${gridGap}`}>
                          <div className="form-group mb-0">
                            <label>BOOKING ID</label>
                            <input type="text" className="input-field font-mono tracking-wider" placeholder="1119N6M7M"
                              value={formData.numer_zlecenia} onChange={e => handleInputChange('numer_zlecenia', e.target.value)} />
                          </div>
                          <div className="form-group mb-0">
                            <label>FRACHT EUR</label>
                            <input type="text" inputMode="decimal" className="input-field" placeholder="0.00"
                              value={formData.cena_eur} onChange={e => handleInputChange('cena_eur', e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* Amazon Załadunki */}
                      {zaladunki.map((zal, index) => (
                        <div key={zal.id} className="border border-gray-200 rounded overflow-hidden">
                          <div className="flex justify-between items-center px-3 py-1.5 bg-green-700">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wide">ZAŁADUNEK {zaladunki.length > 1 ? index + 1 : ''}</h3>
                            {zaladunki.length > 1 && <button type="button" onClick={() => usunZaladunek(zal.id)} className="text-green-200 hover:text-white font-bold text-xs">USUŃ</button>}
                          </div>
                          <div className="p-2">
                            <div className="grid grid-cols-5 gap-2">
                              <div className="form-group mb-0"><label>MIASTO</label>
                                <input type="text" className="input-field" placeholder="ERFURT"
                                  value={zal.miasto} onChange={e => updateZaladunek(zal.id, 'miasto', e.target.value)} />
                              </div>
                              <div className="form-group mb-0"><label>FC CODE</label>
                                <input type="text" className="input-field font-mono" placeholder="ERF1"
                                  value={zal.nazwa_firmy || ''} onChange={e => updateZaladunek(zal.id, 'nazwa_firmy', e.target.value)} />
                              </div>
                              <div className="form-group mb-0"><label>KOD</label>
                                <input type="text" className="input-field font-mono" placeholder="DE99095"
                                  value={krajCode(zal.kraj) + zal.kod}
                                  onChange={e => { const p = parseAmazonCode(e.target.value); updateZaladunek(zal.id, 'kod', p.kod); if (p.kraj) updateZaladunek(zal.id, 'kraj', p.kraj) }} />
                              </div>
                              <div className="form-group mb-0"><label>CZAS</label>
                                <input type="time" className="input-field" value={zal.oknoOd}
                                  onChange={e => { updateZaladunek(zal.id, 'oknoOd', e.target.value); updateZaladunek(zal.id, 'maOkno', true) }} />
                              </div>
                              <div className="form-group mb-0"><label>DATA</label>
                                <input type="date" className="input-field" value={zal.data}
                                  onChange={e => updateZaladunek(zal.id, 'data', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={dodajZaladunek} className="w-full py-1 border-2 border-dashed border-green-700 text-green-700 hover:bg-green-700 hover:text-white transition font-bold rounded text-xs">
                        + DODAJ ZAŁADUNEK
                      </button>

                      {/* Amazon Rozładunki */}
                      {rozladunki.map((roz, index) => (
                        <div key={roz.id} className="border border-gray-200 rounded overflow-hidden">
                          <div className="flex justify-between items-center px-3 py-1.5 bg-copper">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wide">ROZŁADUNEK {rozladunki.length > 1 ? index + 1 : ''}</h3>
                            {rozladunki.length > 1 && <button type="button" onClick={() => usunRozladunek(roz.id)} className="text-orange-200 hover:text-white font-bold text-xs">USUŃ</button>}
                          </div>
                          <div className="p-2">
                            <div className="grid grid-cols-5 gap-2">
                              <div className="form-group mb-0"><label>MIASTO</label>
                                <input type="text" className="input-field" placeholder="MOOSBURG"
                                  value={roz.miasto} onChange={e => updateRozladunek(roz.id, 'miasto', e.target.value)} />
                              </div>
                              <div className="form-group mb-0"><label>FC CODE</label>
                                <input type="text" className="input-field font-mono" placeholder="DMU3"
                                  value={roz.nazwa_firmy || ''} onChange={e => updateRozladunek(roz.id, 'nazwa_firmy', e.target.value)} />
                              </div>
                              <div className="form-group mb-0"><label>KOD</label>
                                <input type="text" className="input-field font-mono" placeholder="DE85368"
                                  value={krajCode(roz.kraj) + roz.kod}
                                  onChange={e => { const p = parseAmazonCode(e.target.value); updateRozladunek(roz.id, 'kod', p.kod); if (p.kraj) updateRozladunek(roz.id, 'kraj', p.kraj) }} />
                              </div>
                              <div className="form-group mb-0"><label>CZAS</label>
                                <input type="time" className="input-field" value={roz.oknoOd}
                                  onChange={e => { updateRozladunek(roz.id, 'oknoOd', e.target.value); updateRozladunek(roz.id, 'maOkno', true) }} />
                              </div>
                              <div className="form-group mb-0"><label>DATA</label>
                                <input type="date" className="input-field" value={roz.data}
                                  onChange={e => updateRozladunek(roz.id, 'data', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={dodajRozladunek} className="w-full py-1 border-2 border-dashed border-copper text-copper hover:bg-copper hover:text-white transition font-bold rounded text-xs">
                        + DODAJ ROZŁADUNEK
                      </button>

                    </>) : (<>

                    {/* Wiersz 2: numer zlecenia + cena (STANDARD ONLY) */}

                    {/* Wiersz 2: numer zlecenia + cena */}
                    <div className={boxClass}>
                      <div className={`grid grid-cols-2 ${gridGap}`}>
                        <div className="form-group">
                          <label>NUMER ZLECENIA (od kontrahenta)</label>
                          <input type="text" className="input-field" placeholder="ZZ-46/ZP/2026/04" value={formData.numer_zlecenia} onChange={e => handleInputChange('numer_zlecenia', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>CENA EUR</label>
                          <input type="text" inputMode="decimal" className="input-field" placeholder="0.00" value={formData.cena_eur} onChange={e => handleInputChange('cena_eur', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Checkboxy */}
                    <div className={boxClass}>
                      <div className={`grid grid-cols-5 ${gridGap}`}>
                        <div>
                          <label className={`flex items-center gap-1.5 font-semibold cursor-pointer text-xs mb-1.5 uppercase ${powrotGranica ? 'text-gray-300 cursor-not-allowed' : 'text-gray-800'}`}>
                            <input type="checkbox" className="w-3.5 h-3.5" checked={wylotGranica}
                              disabled={powrotGranica}
                              onChange={e => setWylotGranica(e.target.checked)} />
                            WYLOT GRANICA
                          </label>
                          {wylotGranica && (
                            <select className="input-field" value={formData.wylotPrzejscie} onChange={e => handleInputChange('wylotPrzejscie', e.target.value)}>
                              <option value="Świecko">PL-DE — Świecko</option>
                              <option value="Kołbaskowo">PL-DE — Kołbaskowo</option>
                              <option value="Zgorzelec">PL-DE — Zgorzelec</option>
                              <option value="Cieszyn">PL-CZ — Cieszyn</option>
                              <option value="Kudowa-Słone">PL-CZ — Kudowa-Słone</option>
                              <option value="Terespol">PL-BY — Terespol</option>
                              <option value="Medyka">PL-UA — Medyka</option>
                              <option value="Dorohusk">PL-UA — Dorohusk</option>
                            </select>
                          )}
                        </div>
                        <div>
                          <label className={`flex items-center gap-1.5 font-semibold cursor-pointer text-xs mb-1.5 uppercase ${wylotGranica ? 'text-gray-300 cursor-not-allowed' : 'text-gray-800'}`}>
                            <input type="checkbox" className="w-3.5 h-3.5" checked={powrotGranica}
                              disabled={wylotGranica}
                              onChange={e => setPowrotGranica(e.target.checked)} />
                            POWRÓT GRANICA
                          </label>
                          {powrotGranica && (
                            <select className="input-field" value={formData.powrotPrzejscie} onChange={e => handleInputChange('powrotPrzejscie', e.target.value)}>
                              <option value="Świecko">PL-DE — Świecko</option>
                              <option value="Kołbaskowo">PL-DE — Kołbaskowo</option>
                              <option value="Zgorzelec">PL-DE — Zgorzelec</option>
                              <option value="Cieszyn">PL-CZ — Cieszyn</option>
                              <option value="Kudowa-Słone">PL-CZ — Kudowa-Słone</option>
                              <option value="Terespol">PL-BY — Terespol</option>
                              <option value="Medyka">PL-UA — Medyka</option>
                              <option value="Dorohusk">PL-UA — Dorohusk</option>
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-gray-800 font-semibold cursor-pointer text-xs mb-1.5 uppercase">
                            <input type="checkbox" className="w-3.5 h-3.5" checked={paletyWymiana} onChange={e => setPaletyWymiana(e.target.checked)} />
                            PALETY WYMIANA
                          </label>
                          {paletyWymiana && (
                            <input type="text" inputMode="numeric" className="input-field mt-1" placeholder="Ile szt?" value={formData.paletyIlosc} onChange={e => handleInputChange('paletyIlosc', e.target.value)} />
                          )}
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-gray-800 font-semibold cursor-pointer text-xs mb-1.5 uppercase">
                            <input type="checkbox" className="w-3.5 h-3.5" checked={adr} onChange={e => setAdr(e.target.checked)} />
                            ADR
                          </label>
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-gray-800 font-semibold cursor-pointer text-xs mb-1.5 uppercase">
                            <input type="checkbox" className="w-3.5 h-3.5" checked={lift} onChange={e => setLift(e.target.checked)} />
                            WINDA
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Kontrahent */}
                    <div className={boxClass}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-xs font-bold uppercase text-navy tracking-wide">KONTRAHENT</h3>
                        {formData.kontrahent_id && <span className="text-green-700 text-xs font-bold bg-green-50 border border-green-300 px-1.5 py-0.5 rounded">W BAZIE</span>}
                      </div>
                      <div className="space-y-1.5">
                        <input type="text" className="input-field" placeholder="Nazwa kontrahenta" value={formData.kontrahent} onChange={e => handleInputChange('kontrahent', e.target.value)} />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-xs font-bold flex-shrink-0">KRAJ</span>
                            <input type="text" className="input-field" placeholder="np. DE" value={formData.kontrahentKraj} onChange={e => handleInputChange('kontrahentKraj', e.target.value)} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-xs font-bold flex-shrink-0">KOD</span>
                            <input type="text" className="input-field" placeholder="kod pocztowy" value={formData.kontrahentKod} onChange={e => handleInputChange('kontrahentKod', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ZALADUNKI */}
                    {zaladunki.map((zal, index) => (
                      <div key={zal.id} className="border border-gray-200 rounded overflow-hidden">
                        <div className="flex justify-between items-center px-3 py-1.5 bg-green-700">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wide">ZALADUNEK {zaladunki.length > 1 ? index + 1 : ''}</h3>
                          {zaladunki.length > 1 && <button type="button" onClick={() => usunZaladunek(zal.id)} className="text-green-200 hover:text-white font-bold text-xs">USUN</button>}
                        </div>
                        <div className="p-2 space-y-1.5">
                          <div className="grid grid-cols-4 gap-2">
                            <div className="form-group mb-0">
                              <label>KOD</label>
                              <input type="text" className="input-field" value={zal.kod} onChange={e => updateZaladunek(zal.id, 'kod', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label>MIASTO</label>
                              <input type="text" className="input-field" value={zal.miasto} onChange={e => updateZaladunek(zal.id, 'miasto', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label>KRAJ</label>
                              <input type="text" className="input-field bg-gray-50 text-gray-500 cursor-default" readOnly value={zal.kraj} tabIndex={-1} />
                            </div>
                            <div className="form-group mb-0">
                              <label>DATA</label>
                              <input type="date" className="input-field" value={zal.data} onChange={e => updateZaladunek(zal.id, 'data', e.target.value)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="form-group mb-0">
                              <label>FIRMA</label>
                              <input type="text" className="input-field" value={zal.nazwa_firmy || ''} onChange={e => updateZaladunek(zal.id, 'nazwa_firmy', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label>ULICA</label>
                              <input type="text" className="input-field" value={zal.ulica} onChange={e => updateZaladunek(zal.id, 'ulica', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label>NR REF</label>
                              <input type="text" className="input-field" value={zal.nr_ref} onChange={e => updateZaladunek(zal.id, 'nr_ref', e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" className="w-3.5 h-3.5" checked={zal.maOkno} onChange={e => updateZaladunek(zal.id, 'maOkno', e.target.checked)} />
                              <span className="text-xs font-bold uppercase text-gray-600">Okno</span>
                            </label>
                            {zal.maOkno && (
                              <div className="flex gap-1 items-center">
                                <input type="time" className="input-field w-20" value={zal.oknoOd} onChange={e => updateZaladunek(zal.id, 'oknoOd', e.target.value)} />
                                <span className="text-gray-500 text-xs">-</span>
                                <input type="time" className="input-field w-20" value={zal.oknoDo} onChange={e => updateZaladunek(zal.id, 'oknoDo', e.target.value)} />
                              </div>
                            )}
                          </div>
                          <div className="form-group mb-0">
                            <label>DODATKOWE INFO</label>
                            <input type="text" className="input-field" placeholder="dodatkowe informacje, uwagi do załadunku..." value={zal.dodatkowe_info} onChange={e => updateZaladunek(zal.id, 'dodatkowe_info', e.target.value)} />
                          </div>
                          {(zal.kontakt_imie || zal.kontakt_telefon) ? (
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <span className="text-green-700 text-xs font-bold flex-shrink-0">KONTAKT</span>
                                <input type="text" className="input-field" placeholder="imie" value={zal.kontakt_imie} onChange={e => updateZaladunek(zal.id, 'kontakt_imie', e.target.value)} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-green-700 text-xs font-bold flex-shrink-0">TEL</span>
                                <input type="text" className="input-field" value={zal.kontakt_telefon} onChange={e => updateZaladunek(zal.id, 'kontakt_telefon', e.target.value)} />
                                <button type="button" onClick={() => { updateZaladunek(zal.id, 'kontakt_imie', ''); updateZaladunek(zal.id, 'kontakt_telefon', '') }} className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0 font-bold">✕</button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => updateZaladunek(zal.id, 'kontakt_imie', ' ')}
                              className="text-xs text-gray-400 hover:text-green-700 font-semibold">+ kontakt klienta</button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={dodajZaladunek} className="w-full py-1 border-2 border-dashed border-green-700 text-green-700 hover:bg-green-700 hover:text-white transition font-bold rounded text-xs">
                      + DODAJ ZALADUNEK
                    </button>

                    {/* ROZLADUNKI */}
                    {rozladunki.map((roz, index) => (
                      <div key={roz.id} className="border border-gray-200 rounded overflow-hidden">
                        <div className="flex justify-between items-center px-3 py-1.5 bg-copper">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wide">ROZLADUNEK {rozladunki.length > 1 ? index + 1 : ''}</h3>
                          {rozladunki.length > 1 && <button type="button" onClick={() => usunRozladunek(roz.id)} className="text-orange-200 hover:text-white font-bold text-xs">USUN</button>}
                        </div>
                        <div className="p-2 space-y-1.5">
                          <div className="grid grid-cols-4 gap-2">
                            <div className="form-group mb-0">
                              <label>KOD</label>
                              <input type="text" className="input-field" value={roz.kod} onChange={e => updateRozladunek(roz.id, 'kod', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label>MIASTO</label>
                              <input type="text" className="input-field" value={roz.miasto} onChange={e => updateRozladunek(roz.id, 'miasto', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label>KRAJ</label>
                              <input type="text" className="input-field bg-gray-50 text-gray-500 cursor-default" readOnly value={roz.kraj} tabIndex={-1} />
                            </div>
                            <div className="form-group mb-0">
                              <label>DATA</label>
                              <input type="date" className="input-field" value={roz.data} onChange={e => updateRozladunek(roz.id, 'data', e.target.value)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="form-group mb-0">
                              <label>FIRMA</label>
                              <input type="text" className="input-field" value={roz.nazwa_firmy || ''} onChange={e => updateRozladunek(roz.id, 'nazwa_firmy', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label>ULICA</label>
                              <input type="text" className="input-field" value={roz.ulica} onChange={e => updateRozladunek(roz.id, 'ulica', e.target.value)} />
                            </div>
                            <div className="form-group mb-0">
                              <label>NR REF</label>
                              <input type="text" className="input-field" value={roz.nr_ref} onChange={e => updateRozladunek(roz.id, 'nr_ref', e.target.value)} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" className="w-3.5 h-3.5" checked={roz.maOkno} onChange={e => updateRozladunek(roz.id, 'maOkno', e.target.checked)} />
                              <span className="text-xs font-bold uppercase text-gray-600">Okno</span>
                            </label>
                            {roz.maOkno && (
                              <div className="flex gap-1 items-center">
                                <input type="time" className="input-field w-20" value={roz.oknoOd} onChange={e => updateRozladunek(roz.id, 'oknoOd', e.target.value)} />
                                <span className="text-gray-500 text-xs">-</span>
                                <input type="time" className="input-field w-20" value={roz.oknoDo} onChange={e => updateRozladunek(roz.id, 'oknoDo', e.target.value)} />
                              </div>
                            )}
                          </div>
                          <div className="form-group mb-0">
                            <label>DODATKOWE INFO</label>
                            <input type="text" className="input-field" placeholder="dodatkowe informacje, uwagi do rozładunku..." value={roz.dodatkowe_info} onChange={e => updateRozladunek(roz.id, 'dodatkowe_info', e.target.value)} />
                          </div>
                          {(roz.kontakt_imie || roz.kontakt_telefon) ? (
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <span className="text-copper text-xs font-bold flex-shrink-0">KONTAKT</span>
                                <input type="text" className="input-field" placeholder="imie" value={roz.kontakt_imie} onChange={e => updateRozladunek(roz.id, 'kontakt_imie', e.target.value)} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-copper text-xs font-bold flex-shrink-0">TEL</span>
                                <input type="text" className="input-field" value={roz.kontakt_telefon} onChange={e => updateRozladunek(roz.id, 'kontakt_telefon', e.target.value)} />
                                <button type="button" onClick={() => { updateRozladunek(roz.id, 'kontakt_imie', ''); updateRozladunek(roz.id, 'kontakt_telefon', '') }} className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0 font-bold">✕</button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => updateRozladunek(roz.id, 'kontakt_imie', ' ')}
                              className="text-xs text-gray-400 hover:text-copper font-semibold">+ kontakt klienta</button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={dodajRozladunek} className="w-full py-1 border-2 border-dashed border-copper text-copper hover:bg-copper hover:text-white transition font-bold rounded text-xs">
                      + DODAJ ROZLADUNEK
                    </button>

                    {/* LADUNEK */}
                    <div className={boxClass}>
                      <h3 className="text-xs font-bold mb-1.5 text-navy uppercase tracking-wide">LADUNEK</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="form-group mb-0">
                          <label>TYP</label>
                          <input type="text" className="input-field" placeholder="Plandeka, Chłodnia..." value={formData.ladunekTyp} onChange={e => handleInputChange('ladunekTyp', e.target.value)} />
                        </div>
                        <div className="form-group mb-0">
                          <label>TOWAR</label>
                          <input type="text" className="input-field" placeholder="opis, waga, wymiary, LDM..." value={formData.ladunekTowar} onChange={e => handleInputChange('ladunekTowar', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    </>)}

                    <div className="flex gap-3 justify-end">
                      <button type="button" className="btn-secondary" onClick={() => { setPdfUploaded(false); setError(null) }}>ANULUJ</button>
                      <button type="submit" className="btn-primary" disabled={isSaving}>
                        {isSaving ? 'ZAPISYWANIE...' : 'WYŚLIJ ZLECENIE'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* WIADOMOŚĆ DLA KIEROWCY */}
                <div className="w-96 flex-shrink-0">
                  <div className="sticky top-6">
                    <div className="driver-message-container rounded-lg shadow-lg">
                      <div className="driver-message-header px-4 py-3 rounded-t-lg">
                        <h3 className="font-bold text-sm uppercase text-white">Wiadomość dla kierowcy</h3>
                      </div>
                      <div className="p-4">
                        <textarea className="driver-message-textarea w-full h-96 p-3 rounded resize-none" value={driverMessage} onChange={e => setDriverMessage(e.target.value)} />
                        <button className="btn-primary w-full mt-3 text-xs" type="button" onClick={() => navigator.clipboard.writeText(driverMessage)}>
                          KOPIUJ WIADOMOŚĆ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORIA */}
        {activeTab === 'history' && (
          <div className="p-3 md:p-6">
            {/* SEARCH */}
            <div className="mb-3 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field pl-9 text-sm bg-white shadow-sm" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600">✕</button>}
            </div>

            {loadingHistory ? (
              <div className="text-center py-16 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper mx-auto mb-3"></div>
                <p className="text-sm">Ładowanie...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="font-medium text-sm">{orders.length === 0 ? 'Brak zleceń w bazie' : 'Brak wyników'}</p>
                {orders.length > 0 && <button onClick={() => { setSearchQuery(''); setDataOd(''); setDataDo('') }} className="mt-2 text-xs text-copper hover:underline">Wyczyść filtry</button>}
              </div>
            ) : (
              <>
                {/* MOBILE — karty */}
                <div className="md:hidden space-y-2">
                  {filteredOrders.map(order => {
                    const isAmaz = order.is_amazon
                    const trasa = [order.zal_kody_trasa, order.roz_kody_trasa].filter(Boolean).join('-')
                    const daty = [shortDate(order.data_zal), shortDate(order.data_roz_ostatni || order.data_roz)].filter(Boolean).join('-')
                    return (
                      <button key={order.id} onClick={() => setSelectedOrder(order)}
                        className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 shadow-sm active:bg-gray-50">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {(order.enrichment_status === 'processing' || order.enrichment_status === 'pending') && (
                              <svg className="w-3.5 h-3.5 animate-spin text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                            )}
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-navy text-white">{order.nr_leo || '—'}</span>
                            {isAmaz && <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">AMZ</span>}
                          </div>
                          <span className="text-xs text-gray-400 font-mono">{order.vrid}</span>
                        </div>
                        {isAmaz ? (
                          <div className="font-bold text-amber-700 font-mono text-sm truncate mb-1">{order.numer_zlecenia || '—'}</div>
                        ) : (
                          <div className="text-sm font-semibold text-gray-800 truncate mb-1">{order.kontrahent_nazwa || '—'}</div>
                        )}
                        <div className="font-mono text-xs text-gray-600 mb-1 truncate">{trasa || '—'}</div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="tabular-nums">{daty}</span>
                          <div className="flex items-center gap-2">
                            <span>{order.km ? `${order.km} km` : ''}</span>
                            <span className="font-bold text-gray-800">{order.cena_eur ? `${order.cena_eur} €` : '—'}</span>
                            {(() => {
                              const p = calcProfit(order)
                              if (p === null) return null
                              return <span className={`font-bold ${p >= 0 ? 'text-green-600' : 'text-red-500'}`}>{p >= 0 ? '+' : ''}{p} €</span>
                            })()}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* DESKTOP — tabela */}
                <div className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {[['nr_leo','LEO'],['kontrahent_nazwa','KONTRAHENT / NR ZL.'],['zal_kody_trasa','TRASA'],['data_zal','DATY'],['km','KM'],['cena_eur','€']].map(([key, label]) => (
                          <th key={key} className="text-left px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap" onClick={() => handleSort(key)}>
                            {label} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </th>
                        ))}
                        <th className="text-left px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">PROFIT</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.map(order => {
                        const isAmaz = order.is_amazon
                        const trasa = [order.zal_kody_trasa, order.roz_kody_trasa].filter(Boolean).join('-')
                        const daty = [shortDate(order.data_zal), shortDate(order.data_roz_ostatni || order.data_roz)].filter(Boolean).join('-')
                        return (
                          <tr key={order.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {(order.enrichment_status === 'processing' || order.enrichment_status === 'pending') && (
                                  <svg className="w-3.5 h-3.5 animate-spin text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                  </svg>
                                )}
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-navy text-white">{order.nr_leo || '—'}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 max-w-[160px]">
                              {isAmaz ? (
                                <div>
                                  <span className="font-bold text-amber-700 font-mono block truncate">{order.numer_zlecenia || order.vrid}</span>
                                  <span className="text-gray-400 font-mono">{order.vrid}</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-medium text-gray-800 block truncate">{order.kontrahent_nazwa || '—'}</span>
                                  <span className="text-gray-400 font-mono">{order.vrid}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className="font-mono text-gray-700 whitespace-nowrap">{trasa || '—'}</span>
                            </td>
                            <td className="px-2 py-1.5 tabular-nums whitespace-nowrap text-gray-600">
                              {daty || '—'}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-500">{order.km || '—'}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-800 whitespace-nowrap">{order.cena_eur ? `${order.cena_eur} €` : '—'}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {(() => {
                                const p = calcProfit(order)
                                if (p === null) return <span className="text-gray-300">—</span>
                                return <span className={`font-bold ${p >= 0 ? 'text-green-600' : 'text-red-500'}`}>{p >= 0 ? '+' : ''}{p} €</span>
                              })()}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1">
                                <button onClick={() => setSelectedOrder(order)} className="px-2 py-1 bg-gray-100 hover:bg-navy hover:text-white text-gray-700 rounded text-xs font-semibold transition-colors">▶</button>
                                {order.pdf_url && (
                                  <button onClick={() => setSelectedOrder(order)} className="px-2 py-1 bg-copper/10 hover:bg-copper text-copper hover:text-white rounded text-xs font-semibold transition-colors border border-copper/20 hover:border-copper">PDF</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* FLOTA */}
        {activeTab === 'fleet' && (
          <div className="p-4 md:p-6">

            {/* MODAL DODAJ AUTO */}
            {showAddFleet && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddFleet(false)}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Dodaj pojazd</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">NR LEO <span className="text-gray-400 normal-case font-normal">(np. 144)</span></label>
                      <input type="text" inputMode="numeric" maxLength={3} placeholder="144"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper font-mono tracking-wider"
                        value={newFleet.nr_leo}
                        onChange={e => setNewFleet(p => ({ ...p, nr_leo: e.target.value.replace(/\D/g,'').slice(0,3) }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Marka / Model</label>
                        <input type="text" placeholder="Scania R450"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper"
                          value={newFleet.marka}
                          onChange={e => setNewFleet(p => ({ ...p, marka: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Typ</label>
                        <input type="text" placeholder="Plandeka 13.6m"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper"
                          value={newFleet.typ}
                          onChange={e => setNewFleet(p => ({ ...p, typ: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rejestracja ciągnika</label>
                        <input type="text" placeholder="DW 12345"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper uppercase"
                          value={newFleet.rejestracja}
                          onChange={e => setNewFleet(p => ({ ...p, rejestracja: e.target.value.toUpperCase() }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rejestracja naczepy</label>
                        <input type="text" placeholder="DW 99999"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper uppercase"
                          value={newFleet.rejestracja_naczepa}
                          onChange={e => setNewFleet(p => ({ ...p, rejestracja_naczepa: e.target.value.toUpperCase() }))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper"
                        value={newFleet.status} onChange={e => setNewFleet(p => ({ ...p, status: e.target.value }))}>
                        <option value="available">Dostępny</option>
                        <option value="busy">W trasie</option>
                        <option value="service">Serwis</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setShowAddFleet(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                      Anuluj
                    </button>
                    <button disabled={savingFleet || !newFleet.nr_leo}
                      onClick={async () => {
                        setSavingFleet(true)
                        try {
                          const nrLeo = `LEO-${newFleet.nr_leo.padStart(3,'0')}`
                          const res = await fetch(`${SUPABASE_URL}/rest/v1/flota`, {
                            method: 'POST',
                            headers: { ...authHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                            body: JSON.stringify({ nr_leo: nrLeo, typ: newFleet.typ || null, marka: newFleet.marka || null, rejestracja: newFleet.rejestracja || null, rejestracja_naczepa: newFleet.rejestracja_naczepa || null, status: newFleet.status }),
                          })
                          if (!res.ok) throw new Error(await res.text())
                          setNewFleet({ nr_leo: '', typ: '', marka: '', rejestracja: '', rejestracja_naczepa: '', status: 'available' })
                          setShowAddFleet(false)
                          fetchFleet()
                        } catch (err) { alert('Błąd: ' + err.message) }
                        setSavingFleet(false)
                      }}
                      className="flex-1 py-2.5 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90 transition-colors disabled:opacity-50">
                      {savingFleet ? 'Zapisuję...' : 'DODAJ'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NAGŁÓWEK */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">FLOTA <span className="text-sm font-normal text-gray-400 ml-1">{fleet.length} pojazdów</span></h2>
              <button onClick={() => setShowAddFleet(true)}
                className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90 transition-colors">
                <span className="text-lg leading-none">+</span> DODAJ AUTO
              </button>
            </div>

            {fleet.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="font-medium text-sm">Brak pojazdów</p>
                <button onClick={() => setShowAddFleet(true)} className="mt-3 text-xs text-copper hover:underline">+ Dodaj pierwszy pojazd</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {fleet.map((v, i) => {
                  const kierowca = Array.isArray(v.kierowcy) ? v.kierowcy[0] : v.kierowcy
                  const statusMap = {
                    available: { text: 'Dostępny', cls: 'bg-green-100 text-green-700' },
                    busy:      { text: 'W trasie', cls: 'bg-blue-100 text-blue-700' },
                    service:   { text: 'Serwis',   cls: 'bg-amber-100 text-amber-700' },
                  }
                  const st = statusMap[v.status] || { text: v.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <div key={v.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50 transition-colors`}>
                      <span className="w-20 flex-shrink-0 text-sm font-bold text-copper font-mono">{v.nr_leo}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-800">{v.marka || '—'}</span>
                        {v.typ && <span className="text-xs text-gray-400 ml-2">{v.typ}</span>}
                      </div>
                      {v.rejestracja && <span className="hidden sm:block text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{v.rejestracja}</span>}
                      {kierowca && <span className="hidden md:block text-xs text-gray-600 truncate max-w-32">{kierowca.imie_nazwisko}</span>}
                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.text}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ORDER DETAIL PANEL */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={handleEditOrder}
          authHeaders={authHeaders}
        />
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePassword && (
        <ChangePassword
          session={authSession}
          onClose={() => setShowChangePassword(false)}
        />
      )}

    </div>
  )
}

export default App
