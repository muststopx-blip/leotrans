// PROCES 2 - WOLNY, BACKGROUND (~30-120s)
// Spedytor NIE widzi tego procesu
// Wyzwalany przez save-zlecenie (fire & forget)
// Pobiera oryginalny plik → konwertuje na JPG → Gemini z max thinking wizualnie analizuje cały dokument

import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { PROMPT_DRIVER_MESSAGE } from '../_shared/prompts.ts'
import { fileToImageParts, type ImagePart } from '../_shared/convert-to-jpg.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const genai = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)
const enrichModel = genai.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    // @ts-ignore
    thinkingConfig: { thinkingBudget: 24576 }, // maksymalne thinking
  },
})

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let zlecenie_id: string | undefined

  try {
    const body = await req.json()
    zlecenie_id = body.zlecenie_id

    if (!zlecenie_id) return errorResponse('Brak zlecenie_id', 400)

    await supabase.from('zlecenia').update({ enrichment_status: 'processing' }).eq('id', zlecenie_id)

    // --------------------------------------------------------
    // KROK 1: Pobierz pełne dane zlecenia
    // --------------------------------------------------------
    const { data: zlecenie, error: zErr } = await supabase
      .from('zlecenia')
      .select(`
        *,
        kontrahenci (id, nazwa, nip, adres_ulica, adres_kod, adres_miasto, kraj, email, telefon, uwagi),
        stoly (nazwa, skrot),
        zaladunki (kolejnosc, nazwa_firmy, ulica, kod, miasto, kraj, data, okno_od, okno_do, ma_okno, nr_ref, kontakt_imie, kontakt_telefon, dodatkowe_info),
        rozladunki (kolejnosc, nazwa_firmy, ulica, kod, miasto, kraj, data, okno_od, okno_do, ma_okno, nr_ref, kontakt_imie, kontakt_telefon, dodatkowe_info)
      `)
      .eq('id', zlecenie_id)
      .single()

    if (zErr || !zlecenie) {
      await markError(zlecenie_id, 'Nie znaleziono zlecenia: ' + zErr?.message)
      return errorResponse('Zlecenie nie znalezione', 404)
    }

    // --------------------------------------------------------
    // KROK 2: Pobierz kierowcę + flotę + konwertuj plik równolegle
    // (flota przez osobne zapytanie — nr_leo to TEXT FK, PostgREST nie obsługuje join)
    // --------------------------------------------------------
    const [kierowcaResult, flotaResult, imageParts] = await Promise.all([
      zlecenie.nr_leo
        ? supabase.from('kierowcy').select('imie_nazwisko, telefon').eq('nr_leo', zlecenie.nr_leo).eq('aktywny', true).maybeSingle()
        : Promise.resolve({ data: null }),
      zlecenie.nr_leo
        ? supabase.from('flota').select('nr_leo, typ, marka, rejestracja, rejestracja_naczepa').eq('nr_leo', zlecenie.nr_leo).maybeSingle()
        : Promise.resolve({ data: null }),
      zlecenie.pdf_url ? fetchAndConvert(String(zlecenie.pdf_url)) : Promise.resolve([]),
    ])

    const kierowca = (kierowcaResult as { data: { imie_nazwisko: string; telefon: string } | null }).data

    const zaladunki = sortByOrder(zlecenie.zaladunki ?? [])
    const rozladunki = sortByOrder(zlecenie.rozladunki ?? [])
    const kontrahent = zlecenie.kontrahenci as Record<string, unknown> | null
    const stol = zlecenie.stoly as { nazwa?: string; skrot?: string } | null

    console.log(`Enrichment ${zlecenie.vrid}: ${imageParts.length} stron(y) obrazów`)

    // --------------------------------------------------------
    // KROK 3: Generuj wiadomość dla kierowcy (jeśli nie ma)
    // --------------------------------------------------------
    let wiadomoscKierowcy = zlecenie.wiadomosc_dla_kierowcy

    if (!wiadomoscKierowcy) {
      const driverData = buildDriverMessageData({ zlecenie, zaladunki, rozladunki, kierowca })
      const driverMsg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: PROMPT_DRIVER_MESSAGE + '\n\nDANE ZLECENIA:\n' + JSON.stringify(driverData, null, 2) }],
      })
      wiadomoscKierowcy = driverMsg.content[0].type === 'text' ? driverMsg.content[0].text.trim() : ''
    }

    // --------------------------------------------------------
    // KROK 4: Głęboka analiza — Gemini 2.5 Flash z max thinking
    // Wizualnie analizuje CAŁY dokument (obrazy JPG) + dane strukturalne
    // --------------------------------------------------------
    const aiInsights = await generateAiInsights({
      zlecenie, kontrahent, zaladunki, rozladunki, kierowca, imageParts,
    })

    // --------------------------------------------------------
    // KROK 5: Przygotuj i zapisz wiersze SpedTrans (spedtrans_output)
    // --------------------------------------------------------
    const flota = (flotaResult as { data: { typ?: string; rejestracja?: string; rejestracja_naczepa?: string } | null }).data

    const spedytorStol = zlecenie.rodzaj_spedytora === 'stol'
      ? (stol?.skrot || stol?.nazwa || zlecenie.spedytor || '')
      : (zlecenie.spedytor ?? '')

    // Szukaj SKROT_ZL: najpierw przez powiazany kontrahent_id,
    // fallback: pelna nazwa + kod pocztowy w tabeli kontrahenci
    const skrotZl = await resolveSkrot(kontrahent, zlecenie)

    const zal0 = zaladunki[0] ?? {}
    const rozLast = rozladunki[rozladunki.length - 1] ?? rozladunki[0] ?? {}

    // ZL_RODZ: T dla LEO-150..154, S dla reszty
    const nrLeoNum = parseInt((String(zlecenie.nr_leo ?? '')).replace(/[^0-9]/g, '') || '0')
    const zlRodz = (nrLeoNum >= 150 && nrLeoNum <= 154) ? 'T' : 'S'
    const infoTow = [zlecenie.ladunek_typ, zlecenie.ladunek_waga, zlecenie.ladunek_wymiary].filter(Boolean).join(' / ')

    const spedtransOutput = {
      'Spedytor':          spedytorStol,
      'Nazwa towaru':      String(zlecenie.ladunek_typ ?? ''),
      'Rodzaj opakowania': zlecenie.palety_wymiana ? 'WYMIANA' : '',
      'ADR':               zlecenie.adr ? 'TAK' : '',
      'Uwagi':             String(zlecenie.rodzaj_zlecenia ?? ''),
      'ZL_RODZ':           zlRodz,
      'ID_OBCE':           String(zlecenie.vrid ?? ''),
      'DATA':              toSpedDate(String(zlecenie.created_at ?? '')),
      'INFO_WEW':          '',
      'NR_ZAM_ZL':         String(zlecenie.numer_zlecenia ?? ''),
      'SKROT_ZL':          skrotZl,
      'SKROT_PL':          skrotZl,
      'SKROT_P':           'LEO-TRANS',
      'SYMBOL_TYP_SAM':    String(flota?.typ ?? ''),
      'NR_REJ_SAM':        String(flota?.rejestracja ?? ''),
      'NR_REJ_NAC':        String(flota?.rejestracja_naczepa ?? ''),
      'NAZW_IMIE_KIER1':   String(kierowca?.imie_nazwisko ?? ''),
      'NAZW_IMIE_KIER2':   '',
      'NAZWA_USL':         'USL. TRANSPORTOWA',
      'DK':                'TAK',
      'P_WALUTA':          'EUR',
      'CNETTO_ZAK':        '',
      'VAT_ZAK':           '23%',
      'ILOSC_ZAK':         '1',
      'JM_ZAK':            'fracht',
      'FV':                'TAK',
      'PL_WALUTA':         'EUR',
      'CNETTO':            zlecenie.cena_eur != null ? String(zlecenie.cena_eur) : '',
      'VAT':               '23%',
      'ILOSC':             '1',
      'JM':                'fracht',
      'DATA_ZAL':          toSpedDate(String(zal0.data ?? '')),
      'GODZ_ZAL':          zal0.ma_okno ? toSpedTime(String(zal0.okno_od ?? '')) : '',
      'GODZ_DO_ZAL':       zal0.ma_okno ? toSpedTime(String(zal0.okno_do ?? '')) : '',
      'SKROT_ZAL':         String(zal0.nazwa_firmy ?? '').substring(0, 15),
      'NAZWA_ZAL':         String(zal0.nazwa_firmy ?? ''),
      'NIP_ZAL':           '',
      'KOD_KRAJ_ZAL':      krajToISO(String(zal0.kraj ?? '')) ?? '',
      'KOD_ZAL':           String(zal0.kod ?? ''),
      'MIASTO_ZAL':        String(zal0.miasto ?? ''),
      'ULICA_ZAL':         String(zal0.ulica ?? ''),
      'TELEFON_ZAL':       String(zal0.kontakt_telefon ?? ''),
      'NR_REF_ZAL':        String(zal0.nr_ref ?? ''),
      'UWAGI_ZAL':         String(zal0.dodatkowe_info ?? ''),
      'DATA_ROZ':          toSpedDate(String(rozLast.data ?? '')),
      'GODZ_ROZ':          rozLast.ma_okno ? toSpedTime(String(rozLast.okno_od ?? '')) : '',
      'GODZ_DO_ROZ':       rozLast.ma_okno ? toSpedTime(String(rozLast.okno_do ?? '')) : '',
      'SKROT_ROZ':         String(rozLast.nazwa_firmy ?? '').substring(0, 15),
      'NAZWA_ROZ':         String(rozLast.nazwa_firmy ?? ''),
      'NIP_ROZ':           '',
      'KOD_KRAJ_ROZ':      krajToISO(String(rozLast.kraj ?? '')) ?? '',
      'KOD_ROZ':           String(rozLast.kod ?? ''),
      'MIASTO_ROZ':        String(rozLast.miasto ?? ''),
      'ULICA_ROZ':         String(rozLast.ulica ?? ''),
      'TELEFON_ROZ':       String(rozLast.kontakt_telefon ?? ''),
      'NR_REF_ROZ':        String(rozLast.nr_ref ?? ''),
      'UWAGI_ROZ':         String(rozLast.dodatkowe_info ?? ''),
      'TYP_LAD':           '',
      'INFO_TOW':          infoTow,
      'WBRUTTO_TOW':       extractKg(String(zlecenie.ladunek_waga ?? '')) ?? '',
    }

    // Zachowaj tez stary format w spedtrans_row (legacykompatybilnosc)
    const spedtransRow = {
      zleceniodawca_nazwa:        skrotZl,
      zleceniodawca_nip:          String(kontrahent?.nip ?? ''),
      zleceniodawca_kod_pocztowy: String(kontrahent?.adres_kod ?? ''),
      cena_eur:                   zlecenie.cena_eur?.toString() ?? '',
      zaladunek_kod:    formatMulti(zaladunki, 'kod', 'ZAL'),
      zaladunek_miasto: formatMulti(zaladunki, 'miasto', 'ZAL'),
      zaladunek_ulica:  formatMulti(zaladunki, 'ulica', 'ZAL'),
      rozladunek_kod:    formatMulti(rozladunki, 'kod', 'ROZ'),
      rozladunek_miasto: formatMulti(rozladunki, 'miasto', 'ROZ'),
      rozladunek_ulica:  formatMulti(rozladunki, 'ulica', 'ROZ'),
      numer_zlecenia:   zlecenie.numer_zlecenia ?? '',
      pdf_link:         zlecenie.pdf_url ?? '',
      spedytor_stol:    spedytorStol,
      leo:              zlecenie.nr_leo ?? '',
      km:               zlecenie.km?.toString() ?? '',
      data_zal:         formatDate(String(zaladunki[0]?.data ?? '')),
      data_roz:         formatDate(String(rozLast.data ?? '')),
      wiadomosc_dla_kierowcy: wiadomoscKierowcy ?? '',
    }

    // --------------------------------------------------------
    // KROK 6: Zapisz wyniki
    // --------------------------------------------------------
    await supabase
      .from('zlecenia')
      .update({
        wiadomosc_dla_kierowcy: wiadomoscKierowcy,
        ai_insights: aiInsights,
        enrichment_status: 'done',
        spedtrans_row: spedtransRow,
      })
      .eq('id', zlecenie_id)

    // Zapisz do spedtrans_output (45 kolumn SpedTrans)
    const { error: spedErr } = await supabase
      .from('spedtrans_output')
      .upsert(
        { zlecenie_id, ...spedtransOutput },
        { onConflict: 'zlecenie_id' }
      )
    if (spedErr) console.warn('spedtrans_output upsert error:', spedErr.message)

    console.log(`✓ Enrichment done: ${zlecenie.vrid}`)
    return jsonResponse({ success: true, vrid: zlecenie.vrid })

  } catch (err) {
    console.error('enrich-zlecenie error:', err)
    if (zlecenie_id) await markError(zlecenie_id, err instanceof Error ? err.message : 'Nieznany błąd')
    return errorResponse(err instanceof Error ? err.message : 'Nieznany błąd')
  }
})

// --------------------------------------------------------
// POBIERZ PLIK I KONWERTUJ NA JPEG
// --------------------------------------------------------
async function fetchAndConvert(url: string): Promise<ImagePart[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) {
      console.warn(`fetchAndConvert: HTTP ${res.status} for ${url}`)
      return []
    }
    const contentType = res.headers.get('content-type') || ''
    const bytes = new Uint8Array(await res.arrayBuffer())
    const filename = url.split('/').pop() || ''
    return await fileToImageParts(bytes, contentType, filename, 6)
  } catch (err) {
    console.warn('fetchAndConvert error:', err)
    return []
  }
}

// --------------------------------------------------------
// AI INSIGHTS — Gemini 2.5 Flash z max thinking + obrazy JPEG
// --------------------------------------------------------
async function generateAiInsights(params: {
  zlecenie: Record<string, unknown>
  kontrahent: Record<string, unknown> | null
  zaladunki: Array<Record<string, unknown>>
  rozladunki: Array<Record<string, unknown>>
  kierowca: { imie_nazwisko: string; telefon: string } | null
  imageParts: ImagePart[]
}): Promise<string> {
  const { zlecenie, kontrahent, zaladunki, rozladunki, kierowca, imageParts } = params

  const hasPdf = imageParts.length > 0

  const promptText = `Jesteś doświadczonym spedytorem. Przeanalizuj zlecenie i wyciągnij informacje których spedytor NIE zobaczy w formularzu.
${hasPdf
    ? `Masz oryginalne strony dokumentu (${imageParts.length} stron) — przeczytaj WSZYSTKO: drobny druk, stopkę, warunki ogólne, klauzule, marginesy, adnotacje. Dokument może być po polsku, niemiecku, angielsku, czesku lub słowacku.`
    : 'Brak dokumentu — analizuj tylko dane strukturalne.'
  }

DANE ZLECENIA (już w formularzu — NIE powtarzaj adresów, dat, towaru, ceny):
Kontrahent: ${kontrahent?.nazwa ?? '—'} | Cena: ${zlecenie.cena_eur ?? '—'} EUR | Km: ${zlecenie.km ?? '—'}
Załadunki: ${zaladunki.map(z => `${z.nazwa_firmy} ${z.miasto}`).join(', ')}
Rozładunki: ${rozladunki.map(r => `${r.nazwa_firmy} ${r.miasto}`).join(', ')}
Dodatkowe info ze stopów: ${[...zaladunki, ...rozladunki].map(s => s.dodatkowe_info).filter(Boolean).join(' | ')}

ZASADY FORMATOWANIA:
- Pisz po polsku
- Nagłówek sekcji WERSALIKAMI na osobnej linii
- Każdy punkt zaczyna się od "— "
- Telefony zapisuj dokładnie jak w dokumencie
- Emaile zapisuj dokładnie jak w dokumencie, pomijaj te z domeną leo-trans
- Żadnego JSON, żadnych gwiazdek, żadnego markdown
- Pomiń całą sekcję jeśli nie masz danych

WYPEŁNIJ TYLKO TE SEKCJE (w tej kolejności):

KONTAKTY
— każdy telefon i email z dokumentu (oprócz leo-trans.pl) z opisem kto to jest / do czego służy

WARUNKI PŁATNOŚCI
— termin płatności (ile dni, od czego liczony)
— co trzeba dołączyć do faktury (CMR oryginał, POD, inne dokumenty)
— kary lub odsetki za opóźnienie faktury

WYMAGANIA OPERACYJNE
— awizacja (kiedy, jak, pod jaki numer/email)
— procedury wejścia na teren (dokumenty kierowcy, języki, rejestracja)
— przerwy/ograniczenia godzinowe przy załadunku/rozładunku
— specjalne instrukcje dla kierowcy

WYMAGANIA POJAZDU
— certyfikaty, wyposażenie (tylko jeśli niestandardowe)

DROBNY DRUK
— kary umowne (kwoty, warunki)
— limit odpowiedzialności przewoźnika
— wymagane ubezpieczenie OC (minimalna suma)
— inne klauzule specjalne lub OWU

ALERTY
— wszystko pilne, niestandardowe, ryzykowne lub co może zaskoczyć w trasie`

  try {
    // Buduj parts: najpierw obrazy (wszystkie strony dokumentu), potem prompt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [...imageParts, promptText]
    const response = await enrichModel.generateContent(parts)
    return response.response.text().trim()
  } catch (err) {
    console.error('AI insights error:', err)
    // Fallback: bez obrazów
    if (imageParts.length > 0) {
      try {
        const response = await enrichModel.generateContent(promptText)
        return response.response.text().trim()
      } catch { return '' }
    }
    return ''
  }
}

// --------------------------------------------------------
// HELPERS
// --------------------------------------------------------

// Szuka SKROT_ZL w tabeli kontrahenci:
// 1. Jesli powiazany kontrahent (id FK) → uzyj jego nazwy
// 2. Fallback → szukaj po pelnej nazwie + kod pocztowy
async function resolveSkrot(
  kontrahent: Record<string, unknown> | null,
  zlecenie: Record<string, unknown>
): Promise<string> {
  if (kontrahent?.nazwa) {
    return String(kontrahent.nazwa).substring(0, 30)
  }

  const prevRow = zlecenie.spedtrans_row as Record<string, unknown> | null
  const searchNazwa = String(prevRow?.zleceniodawca_nazwa ?? '').trim()
  const searchKod = String(prevRow?.zleceniodawca_kod_pocztowy ?? '').trim()

  if (!searchNazwa) return ''

  const { data } = await supabase
    .from('kontrahenci')
    .select('id, nazwa, adres_kod')
    .ilike('nazwa', `%${searchNazwa.substring(0, 50)}%`)
    .limit(10)

  if (!data?.length) return searchNazwa.substring(0, 30)

  if (searchKod) {
    const byKod = data.find(k => k.adres_kod === searchKod)
    if (byKod) return byKod.nazwa.substring(0, 30)
  }

  return data[0].nazwa.substring(0, 30)
}

async function markError(id: string, msg: string) {
  await supabase.from('zlecenia').update({ enrichment_status: 'error', enrichment_error: msg }).eq('id', id)
}

function sortByOrder<T extends { kolejnosc: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.kolejnosc - b.kolejnosc)
}

function formatMulti(list: Array<Record<string, unknown>>, field: string, prefix: string): string {
  if (!list?.length) return ''
  if (list.length === 1) return String(list[0][field] ?? '')
  return list.map((item, i) => `${prefix} ${i + 1}: ${item[field] ?? ''}`).join('\n')
}

function formatDate(d: string): string {
  if (!d) return ''
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d
}

function toSpedDate(d: string): string {
  if (!d) return ''
  // YYYY-MM-DD → YYYYMMDD; also handle YYYY-MM-DDTHH:mm...
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}${m[2]}${m[3]}` : ''
}

function toSpedTime(t: string): string {
  if (!t) return ''
  return t.substring(0, 5) // HH:MM:SS → HH:MM
}

function krajToISO(kraj: string): string | null {
  if (!kraj) return null
  const map: Record<string, string> = {
    'polska': 'PL', 'poland': 'PL',
    'niemcy': 'DE', 'germany': 'DE', 'deutschland': 'DE',
    'czechy': 'CZ', 'czech': 'CZ', 'česká': 'CZ',
    'austria': 'AT', 'österreich': 'AT',
    'francja': 'FR', 'france': 'FR', 'frankreich': 'FR',
    'wlochy': 'IT', 'włochy': 'IT', 'italy': 'IT', 'italien': 'IT',
    'hiszpania': 'ES', 'spain': 'ES', 'spanien': 'ES',
    'slowacja': 'SK', 'słowacja': 'SK', 'slovakia': 'SK',
    'wegry': 'HU', 'węgry': 'HU', 'hungary': 'HU', 'ungarn': 'HU',
    'holandia': 'NL', 'netherlands': 'NL', 'niederlande': 'NL',
    'belgia': 'BE', 'belgium': 'BE', 'belgien': 'BE',
    'rumunia': 'RO', 'romania': 'RO',
    'szwajcaria': 'CH', 'switzerland': 'CH',
    'wielka brytania': 'GB', 'uk': 'GB',
  }
  const key = kraj.toLowerCase().trim()
  return map[key] ?? (kraj.length === 2 ? kraj.toUpperCase() : null)
}

function extractKg(waga: string): string | null {
  if (!waga) return null
  const m = waga.match(/(\d+(?:[.,]\d+)?)\s*(t\b)?/i)
  if (!m) return null
  const num = parseFloat(m[1].replace(',', '.'))
  return m[2]?.toLowerCase() === 't' ? String(Math.round(num * 1000)) : String(Math.round(num))
}

function buildDriverMessageData(params: {
  zlecenie: Record<string, unknown>
  zaladunki: Array<Record<string, unknown>>
  rozladunki: Array<Record<string, unknown>>
  kierowca: { imie_nazwisko: string; telefon: string } | null
}): Record<string, unknown> {
  const { zlecenie, zaladunki, rozladunki, kierowca } = params
  const kontrahent = zlecenie.kontrahenci as { nazwa?: string } | null
  return {
    kontrahent: kontrahent?.nazwa ?? '',
    numer_zlecenia: zlecenie.numer_zlecenia ?? '',
    nr_leo: zlecenie.nr_leo ?? '',
    km: zlecenie.km ?? '',
    ladunek_typ: zlecenie.ladunek_typ ?? '',
    ladunek_waga: zlecenie.ladunek_waga ?? '',
    ladunek_wymiary: zlecenie.ladunek_wymiary ?? '',
    numery_referencyjne: zlecenie.numery_referencyjne ?? '',
    palety_wymiana: zlecenie.palety_wymiana,
    palety_ilosc: zlecenie.palety_ilosc,
    wylot_granica: zlecenie.wylot_granica,
    wylot_przejscie: zlecenie.wylot_przejscie,
    powrot_granica: zlecenie.powrot_granica,
    powrot_przejscie: zlecenie.powrot_przejscie,
    kierowca: kierowca?.imie_nazwisko ?? null,
    zaladunki,
    rozladunki,
  }
}
