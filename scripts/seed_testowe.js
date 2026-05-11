// ============================================================
// Seed zlecenia testowe — przetwarza PDFy przez OCR i zapisuje do DB
// node seed_testowe.js
// ============================================================

import { readFile, readdir } from 'fs/promises'
import { join, basename } from 'path'

const SUPABASE_URL = 'https://zfpqoslxvzblzqkhrqyg.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmcHFvc2x4dnpibHpxa2hycXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzEyMzMsImV4cCI6MjA5MzgwNzIzM30.ZCXUvf_jFGuFsce4jc6d6_aUVh7WnOqV42pgib7p7H4'
const EDGE = `${SUPABASE_URL}/functions/v1`
const PDF_DIR = 'C:/nexus/zlecenia_testowe'

const AUTH = {
  'Authorization': `Bearer ${ANON_KEY}`,
  'apikey': ANON_KEY,
}

// Lista spedytorów do rotacji (inicjały)
const SPEDYTORZY = ['FK', 'DU', 'MS', 'OK', 'MK', 'EK', 'KCh', 'DJ', 'KP', 'JW', 'BS', 'MR', 'MJ']

async function ocr(pdfPath) {
  const fileData = await readFile(pdfPath)
  const filename = basename(pdfPath)

  // Budujemy multipart/form-data ręcznie jako Buffer (unikamy problemów z Blob w Node.js fetch)
  const boundary = '----LeoTransBoundary' + Date.now().toString(16)
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`
  )
  const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([preamble, fileData, epilogue])

  const res = await fetch(`${EDGE}/ocr-zlecenie`, {
    method: 'POST',
    headers: {
      ...AUTH,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
    },
    body,
  })
  return res.json()
}

async function save(ocrResult, spedytor) {
  const ex = ocrResult.extracted || {}

  const zaladunki = ex.zaladunki?.length
    ? ex.zaladunki.map((z, i) => ({
        kolejnosc: i + 1,
        ulica: z.ulica || null,
        kod: z.kod || null,
        miasto: z.miasto || null,
        kraj: z.kraj || 'Niemcy',
        data: z.data || null,
        okno_od: z.okno_od || null,
        okno_do: z.okno_do || null,
        ma_okno: !!(z.okno_od),
        nr_ref: z.nr_ref || null,
        nazwa_firmy: z.nazwa_firmy || null,
      }))
    : [{ kolejnosc: 1, kraj: 'Niemcy' }]

  const rozladunki = ex.rozladunki?.length
    ? ex.rozladunki.map((r, i) => ({
        kolejnosc: i + 1,
        ulica: r.ulica || null,
        kod: r.kod || null,
        miasto: r.miasto || null,
        kraj: r.kraj || 'Niemcy',
        data: r.data || null,
        okno_od: r.okno_od || null,
        okno_do: r.okno_do || null,
        ma_okno: !!(r.okno_od),
        nr_ref: r.nr_ref || null,
        nazwa_firmy: r.nazwa_firmy || null,
      }))
    : [{ kolejnosc: 1, kraj: 'Niemcy' }]

  const payload = {
    numer_zlecenia: ex.numer_zlecenia || null,
    kontrahent_id: ocrResult.kontrahent_match?.id || null,
    kontrahent_nowy: !ocrResult.kontrahent_match?.id && ex.zleceniodawca_nazwa
      ? {
          nazwa: ex.zleceniodawca_nazwa,
          nip: ex.zleceniodawca_nip || null,
        }
      : undefined,
    spedytor,
    cena_eur: parseFloat(ex.cena_eur) || null,
    km: ex.km ? parseInt(ex.km) : null,
    pdf_url: ocrResult.pdf_url || null,
    rodzaj_zlecenia: 'GIEŁDA',
    ladunek_typ: ex.towar_opis || null,
    ladunek_waga: ex.waga || null,
    ladunek_wymiary: ex.wymiary || null,
    zaladunki,
    rozladunki,
  }

  const res = await fetch(`${EDGE}/save-zlecenie`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH },
    body: JSON.stringify(payload),
  })
  return res.json()
}

async function main() {
  const files = (await readdir(PDF_DIR))
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort()

  console.log(`\n📂 Znaleziono ${files.length} plików PDF\n`)

  const results = { ok: [], failed: [] }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const spedytor = SPEDYTORZY[i % SPEDYTORZY.length]
    const pdfPath = join(PDF_DIR, file)

    process.stdout.write(`  [${i + 1}/${files.length}] ${file.padEnd(35)} `)

    try {
      // OCR
      const ocrResult = await ocr(pdfPath)
      if (!ocrResult.success) {
        const msg = ocrResult.error || JSON.stringify(ocrResult)
        console.log(`✗ OCR: ${msg}`)
        results.failed.push({ file, error: msg })
        continue
      }

      const ex = ocrResult.extracted || {}
      process.stdout.write(`OCR✓ `)

      // SAVE
      const saveResult = await save(ocrResult, spedytor)
      if (!saveResult.success) {
        const msg = saveResult.error || JSON.stringify(saveResult)
        console.log(`✗ SAVE: ${msg}`)
        results.failed.push({ file, error: msg })
        continue
      }

      const kontrahent = ex.zleceniodawca_nazwa?.substring(0, 20) || '?'
      console.log(`SAVE✓  ${saveResult.vrid}  ${kontrahent}  ${ex.cena_eur ? ex.cena_eur + '€' : ''} [${spedytor}]`)
      results.ok.push({ file, vrid: saveResult.vrid })

    } catch (err) {
      console.log(`✗ ${err.message}`)
      if (i === 0) console.error(err.stack)
      results.failed.push({ file, error: err.message })
    }

    // Krótka pauza między requestami żeby nie przeciążyć Gemini
    if (i < files.length - 1) await new Promise(r => setTimeout(r, 1500))
  }

  console.log(`\n✅ Zapisano: ${results.ok.length}/${files.length}`)
  if (results.failed.length > 0) {
    console.log(`\n❌ Błędy (${results.failed.length}):`)
    results.failed.forEach(r => console.log(`  - ${r.file}: ${r.error}`))
  }
  console.log('\n🏁 Gotowe! Sprawdź HISTORIĘ w aplikacji.\n')
}

main().catch(console.error)
