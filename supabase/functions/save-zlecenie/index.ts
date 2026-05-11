// ZAPIS ZLECENIA + wyzwolenie Procesu 2
// Wywołany gdy spedytor kliknie WYŚLIJ w formularzu
// Zwraca VRID natychmiast, Proces 2 działa w tle

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ZaladuneRow {
  kolejnosc: number
  nazwa_firmy?: string
  ulica?: string
  kod?: string
  miasto?: string
  kraj?: string
  data?: string
  okno_od?: string
  okno_do?: string
  ma_okno?: boolean
  nr_ref?: string
  kontakt_imie?: string
  kontakt_telefon?: string
  dodatkowe_info?: string
}

interface SaveZleceniaBody {
  // Dane formularza (po weryfikacji przez spedytora)
  numer_zlecenia?: string
  kontrahent_id?: string
  kontrahent_nowy?: {
    nazwa: string
    nip?: string
    adres_kod?: string
    adres_miasto?: string
    kraj?: string
  }
  spedytor?: string
  created_by?: string
  nr_leo?: string
  pod_link?: string
  kontrahent_email?: string
  kontrahent_telefon?: string
  rodzaj_zlecenia?: string
  cena_eur?: number
  km?: number
  pdf_url?: string
  is_amazon?: boolean
  adr?: boolean
  lift?: boolean
  palety_wymiana?: boolean
  palety_ilosc?: number
  palety_gdzie?: string
  wylot_granica?: boolean
  wylot_przejscie?: string
  powrot_granica?: boolean
  powrot_przejscie?: string
  ladunek_typ?: string
  ladunek_waga?: string
  ladunek_wymiary?: string
  numery_referencyjne?: string
  wiadomosc_dla_kierowcy?: string
  rodzaj_spedytora?: string
  stol_id?: string
  zaladunki: ZaladuneRow[]
  rozladunki: ZaladuneRow[]
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body: SaveZleceniaBody = await req.json()

    // 1. Jeśli kontrahent nowy (nie ma ID), utwórz go
    let kontrahentId = body.kontrahent_id
    if (!kontrahentId && body.kontrahent_nowy?.nazwa) {
      const { data: newK, error: kErr } = await supabase
        .from('kontrahenci')
        .insert({
          nazwa: body.kontrahent_nowy.nazwa,
          nip: body.kontrahent_nowy.nip ?? null,
          adres_kod: body.kontrahent_nowy.adres_kod ?? null,
          adres_miasto: body.kontrahent_nowy.adres_miasto ?? null,
          kraj: body.kontrahent_nowy.kraj ?? 'PL',
        })
        .select('id')
        .single()

      if (kErr) {
        // Kontrahent może już istnieć (race condition) - spróbuj pobrać
        if (kErr.code === '23505' && body.kontrahent_nowy.nip) {
          const { data: existing } = await supabase
            .from('kontrahenci')
            .select('id')
            .eq('nip', body.kontrahent_nowy.nip)
            .single()
          kontrahentId = existing?.id
        }
      } else {
        kontrahentId = newK?.id
      }
    }

    // 2. Jeśli nr_leo podany, upewnij się że istnieje w flocie (auto-upsert)
    if (body.nr_leo) {
      await supabase
        .from('flota')
        .upsert({ nr_leo: body.nr_leo, status: 'available' }, { onConflict: 'nr_leo', ignoreDuplicates: true })
    }

    // 3. Zapisz zlecenie (VRID generuje DB automatycznie)
    const { data: zlecenie, error: zErr } = await supabase
      .from('zlecenia')
      .insert({
        numer_zlecenia: body.numer_zlecenia ?? null,
        kontrahent_id: kontrahentId ?? null,
        spedytor: body.spedytor ?? null,
        created_by: body.created_by ?? null,
        nr_leo: body.nr_leo ?? null,
        rodzaj_zlecenia: body.rodzaj_zlecenia ?? 'GIEŁDA',
        cena_eur: body.cena_eur ?? null,
        km: body.km ?? null,
        pdf_url: body.pdf_url ?? null,
        wiadomosc_dla_kierowcy: body.wiadomosc_dla_kierowcy ?? null,
        is_amazon: body.is_amazon ?? false,
        adr: body.adr ?? false,
        lift: body.lift ?? false,
        palety_wymiana: body.palety_wymiana ?? false,
        palety_ilosc: body.palety_ilosc ?? null,
        palety_gdzie: body.palety_gdzie ?? null,
        wylot_granica: body.wylot_granica ?? false,
        wylot_przejscie: body.wylot_przejscie ?? null,
        powrot_granica: body.powrot_granica ?? false,
        powrot_przejscie: body.powrot_przejscie ?? null,
        ladunek_typ: body.ladunek_typ ?? null,
        ladunek_waga: body.ladunek_waga ?? null,
        ladunek_wymiary: body.ladunek_wymiary ?? null,
        numery_referencyjne: body.numery_referencyjne ?? null,
        pod_link: body.pod_link ?? null,
        rodzaj_spedytora: body.rodzaj_spedytora ?? 'solo',
        stol_id: body.stol_id ?? null,
        enrichment_status: 'pending',
      })
      .select('id, vrid')
      .single()

    if (zErr || !zlecenie) {
      console.error('save zlecenie error:', zErr)
      return errorResponse('Błąd zapisu zlecenia: ' + zErr?.message, 500)
    }

    const zlecenieid = zlecenie.id

    // 3. Zapisz załadunki
    if (body.zaladunki?.length > 0) {
      const { error: zalErr } = await supabase
        .from('zaladunki')
        .insert(
          body.zaladunki.map((z, i) => ({
            zlecenie_id: zlecenieid,
            kolejnosc: z.kolejnosc ?? i + 1,
            nazwa_firmy: z.nazwa_firmy ?? null,
            ulica: z.ulica ?? null,
            kod: z.kod ?? null,
            miasto: z.miasto ?? null,
            kraj: z.kraj ?? 'Niemcy',
            data: z.data ? parseDate(z.data) : null,
            okno_od: z.okno_od ?? null,
            okno_do: z.okno_do ?? null,
            ma_okno: z.ma_okno ?? false,
            nr_ref: z.nr_ref ?? null,
            kontakt_imie: z.kontakt_imie ?? null,
            kontakt_telefon: z.kontakt_telefon ?? null,
            dodatkowe_info: z.dodatkowe_info ?? null,
          }))
        )
      if (zalErr) console.error('załadunki insert error:', zalErr)
    }

    // 4. Zapisz rozładunki
    if (body.rozladunki?.length > 0) {
      const { error: rozErr } = await supabase
        .from('rozladunki')
        .insert(
          body.rozladunki.map((r, i) => ({
            zlecenie_id: zlecenieid,
            kolejnosc: r.kolejnosc ?? i + 1,
            nazwa_firmy: r.nazwa_firmy ?? null,
            ulica: r.ulica ?? null,
            kod: r.kod ?? null,
            miasto: r.miasto ?? null,
            kraj: r.kraj ?? 'Niemcy',
            data: r.data ? parseDate(r.data) : null,
            okno_od: r.okno_od ?? null,
            okno_do: r.okno_do ?? null,
            ma_okno: r.ma_okno ?? false,
            nr_ref: r.nr_ref ?? null,
            kontakt_imie: r.kontakt_imie ?? null,
            kontakt_telefon: r.kontakt_telefon ?? null,
            dodatkowe_info: r.dodatkowe_info ?? null,
          }))
        )
      if (rozErr) console.error('rozładunki insert error:', rozErr)
    }

    // 5. Zaktualizuj status floty (pojazd zajęty)
    if (body.nr_leo) {
      await supabase
        .from('flota')
        .update({ status: 'busy' })
        .eq('nr_leo', body.nr_leo)
    }

    // 6. Wyzwól Proces 2 (fire & forget - nie blokuje odpowiedzi)
    triggerEnrichment(zlecenieid)

    // 7. Zwróć VRID natychmiast
    return jsonResponse({
      success: true,
      vrid: zlecenie.vrid,
      zlecenie_id: zlecenieid,
    })

  } catch (err) {
    console.error('save-zlecenie error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Nieznany błąd')
  }
})

// Fire & forget wywołanie enrich-zlecenie
function triggerEnrichment(zlecenie_id: string) {
  const enrichUrl = `${SUPABASE_URL}/functions/v1/enrich-zlecenie`
  fetch(enrichUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ zlecenie_id }),
  }).catch(err => {
    console.error('Błąd wyzwolenia enrichmentu:', err)
  })
}

// Parser dat DD.MM.YYYY → YYYY-MM-DD (format PostgreSQL DATE)
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  // Obsługa DD.MM.YYYY
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Obsługa YYYY-MM-DD (już OK)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  return null
}
