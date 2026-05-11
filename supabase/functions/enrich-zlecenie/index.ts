// PROCES 2 - WOLNY, BACKGROUND (~15-60s)
// Spedytor NIE widzi tego procesu
// Wyzwalany po kliknięciu WYŚLIJ przez save-zlecenie (fire & forget)

import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { PROMPT_DRIVER_MESSAGE } from '../_shared/prompts.ts'

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
    // @ts-ignore - thinkingConfig not yet in type defs
    thinkingConfig: { thinkingBudget: 8000 },
  },
})

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let zlecenie_id: string | undefined

  try {
    const body = await req.json()
    zlecenie_id = body.zlecenie_id

    if (!zlecenie_id) {
      return errorResponse('Brak zlecenie_id', 400)
    }

    await supabase
      .from('zlecenia')
      .update({ enrichment_status: 'processing' })
      .eq('id', zlecenie_id)

    // --------------------------------------------------------
    // KROK 1: Pobierz pełne dane zlecenia
    // --------------------------------------------------------
    const { data: zlecenie, error: zErr } = await supabase
      .from('zlecenia')
      .select(`
        *,
        kontrahenci (id, nazwa, nip, adres_ulica, adres_kod, adres_miasto, kraj, email, telefon, uwagi),
        flota (nr_leo, typ, marka, rejestracja, rejestracja_naczepa),
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
    // KROK 2: Pobierz kierowcę przypisanego do pojazdu
    // --------------------------------------------------------
    let kierowca: { imie_nazwisko: string; telefon: string } | null = null
    if (zlecenie.nr_leo) {
      const { data: kData } = await supabase
        .from('kierowcy')
        .select('imie_nazwisko, telefon')
        .eq('nr_leo', zlecenie.nr_leo)
        .eq('aktywny', true)
        .maybeSingle()
      kierowca = kData
    }

    const zaladunki = sortByOrder(zlecenie.zaladunki ?? [])
    const rozladunki = sortByOrder(zlecenie.rozladunki ?? [])
    const kontrahent = zlecenie.kontrahenci as Record<string, unknown> | null
    const stol = zlecenie.stoly as { nazwa?: string; skrot?: string } | null

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
    // KROK 4: Głęboka analiza AI (Claude z extended thinking)
    // --------------------------------------------------------
    const aiInsights = await generateAiInsights({ zlecenie, kontrahent, zaladunki, rozladunki, kierowca })

    // --------------------------------------------------------
    // KROK 5: Przygotuj wiersz SpedTrans
    // --------------------------------------------------------
    const spedytorStol = zlecenie.rodzaj_spedytora === 'stol'
      ? (stol?.skrot || stol?.nazwa || zlecenie.spedytor || '')
      : (zlecenie.spedytor ?? '')

    const spedtransRow = {
      zleceniodawca_nazwa:        kontrahent?.nazwa ?? '',
      zleceniodawca_nip:          kontrahent?.nip ?? '',
      zleceniodawca_kod_pocztowy: kontrahent?.adres_kod ?? '',
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
      data_zal:         formatDate(zaladunki[0]?.data ?? ''),
      data_roz:         formatDate(rozladunki[0]?.data ?? ''),
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

    await supabase
      .from('spedtrans_export')
      .upsert({ zlecenie_id, ...spedtransRow }, { onConflict: 'zlecenie_id' })

    console.log(`✓ Enrichment done: ${zlecenie.vrid}`)

    return jsonResponse({ success: true, vrid: zlecenie.vrid })

  } catch (err) {
    console.error('enrich-zlecenie error:', err)
    if (zlecenie_id) await markError(zlecenie_id, err instanceof Error ? err.message : 'Nieznany błąd')
    return errorResponse(err instanceof Error ? err.message : 'Nieznany błąd')
  }
})

// --------------------------------------------------------
// AI INSIGHTS - Gemini 2.5 Flash z thinking
// --------------------------------------------------------
async function generateAiInsights(params: {
  zlecenie: Record<string, unknown>
  kontrahent: Record<string, unknown> | null
  zaladunki: Array<Record<string, unknown>>
  rozladunki: Array<Record<string, unknown>>
  kierowca: { imie_nazwisko: string; telefon: string } | null
}): Promise<string> {
  const { zlecenie, kontrahent, zaladunki, rozladunki, kierowca } = params

  const stopsInfo = [
    ...zaladunki.map((z, i) => ({
      typ: 'ZAŁADUNEK', idx: i + 1,
      miasto: z.miasto, firma: z.nazwa_firmy, kod: z.kod, kraj: z.kraj,
      data: z.data, okno: z.okno_od ? `${z.okno_od}–${z.okno_do}` : null,
      nr_ref: z.nr_ref, kontakt_imie: z.kontakt_imie, kontakt_telefon: z.kontakt_telefon,
      dodatkowe_info: z.dodatkowe_info,
    })),
    ...rozladunki.map((r, i) => ({
      typ: 'ROZŁADUNEK', idx: i + 1,
      miasto: r.miasto, firma: r.nazwa_firmy, kod: r.kod, kraj: r.kraj,
      data: r.data, okno: r.okno_od ? `${r.okno_od}–${r.okno_do}` : null,
      nr_ref: r.nr_ref, kontakt_imie: r.kontakt_imie, kontakt_telefon: r.kontakt_telefon,
      dodatkowe_info: r.dodatkowe_info,
    })),
  ]

  const prompt = `Jesteś ekspertem spedycyjnym. Przeanalizuj dane zlecenia transportowego i stwórz kompletny raport dla spedytora.

DANE ZLECENIA:
${JSON.stringify({
  vrid: zlecenie.vrid,
  numer_zlecenia: zlecenie.numer_zlecenia,
  rodzaj_zlecenia: zlecenie.rodzaj_zlecenia,
  cena_eur: zlecenie.cena_eur,
  km: zlecenie.km,
  ladunek_typ: zlecenie.ladunek_typ,
  ladunek_waga: zlecenie.ladunek_waga,
  ladunek_wymiary: zlecenie.ladunek_wymiary,
  adr: zlecenie.adr,
  lift: zlecenie.lift,
  palety_wymiana: zlecenie.palety_wymiana,
  palety_ilosc: zlecenie.palety_ilosc,
  wylot_przejscie: zlecenie.wylot_przejscie,
  powrot_przejscie: zlecenie.powrot_przejscie,
  numery_referencyjne: zlecenie.numery_referencyjne,
  pod_link: zlecenie.pod_link,
  kontrahent_email: zlecenie.kontrahent_email,
  kontrahent_telefon: zlecenie.kontrahent_telefon,
}, null, 2)}

KONTRAHENT: ${JSON.stringify(kontrahent, null, 2)}
STOPY: ${JSON.stringify(stopsInfo, null, 2)}
KIEROWCA: ${JSON.stringify(kierowca, null, 2)}

ZADANIE — stwórz raport:
1. KONTAKTY — WSZYSTKIE emaile (pomiń leo-trans.pl) i telefony ze wszystkich pól
2. TERMINY — deadlines: "24h na POD", "faktura do X dnia", awizacje, limity czasu — szukaj też w dodatkowe_info (może być po niemiecku/angielsku/czesku)
3. NUMERY REF — wszystkie numery referencyjne z kontekstem
4. ŁADUNEK — typ, waga, wymiary, palety, wymagania specjalne
5. UWAGI OPERACYJNE — przetłumacz na polski i skróć dodatkowe_info z każdego stopu; ważne instrukcje, procedury, wymagania wejścia
6. TRASA — relacja, kraje, przejścia graniczne
7. STAWKA — fracht, €/km, ocena opłacalności

Format odpowiedzi TYLKO:

KONTAKTY
— email@example.com — kontrahent główny
— +49 123 456 — załadunek 1

TERMINY
— 24h na wysłanie POD po dostawie — prześlij na email kontrahenta

NUMERY REF
— ABC-123 — załadunek 1

ŁADUNEK
— 22 europalety, 24 000 kg, plandeka standard

UWAGI OPERACYJNE
— Załadunek 1: wymagane awizo min. 24h, wejście bramą B
— Rozładunek 1: rozładunek od przodu, dok nr 3, 06:00–16:00

TRASA
— PL → DE, przejście Świecko, ~8h

STAWKA
— 1200€ / 850 km = 1.41€/km — powyżej progu opłacalności

Pomiń sekcje bez danych. Bądź bardzo zwięzły i konkretny.`

  try {
    const response = await enrichModel.generateContent(prompt)
    return response.response.text().trim()
  } catch (err) {
    console.error('AI insights error:', err)
    return ''
  }
}

// --------------------------------------------------------
// HELPERS
// --------------------------------------------------------

async function markError(id: string, msg: string) {
  await supabase
    .from('zlecenia')
    .update({ enrichment_status: 'error', enrichment_error: msg })
    .eq('id', id)
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
