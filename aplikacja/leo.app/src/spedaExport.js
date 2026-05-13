import * as XLSX from 'xlsx'

// SpedTrans import — 81 kolumn, wszystkie TEXT, daty YYYYMMDD, czas HH:mm
// ZL_RODZ: S = spedycja (wszystkie), T = transport (LEO-150..154)
// ID_OBCE = VRID, SKROT_ZL/PL = kontrahent z bazy SpedTrans

const COUNTRY_CODES = {
  'Niemcy': 'DE', 'Polska': 'PL', 'Francja': 'FR', 'Włochy': 'IT',
  'Hiszpania': 'ES', 'Austria': 'AT', 'Czechy': 'CZ', 'Holandia': 'NL',
  'Belgia': 'BE', 'Szwecja': 'SE', 'Dania': 'DK', 'Norwegia': 'NO',
  'Szwajcaria': 'CH', 'Portugalia': 'PT', 'Węgry': 'HU', 'Rumunia': 'RO',
  'Słowacja': 'SK', 'Słowenia': 'SI', 'Chorwacja': 'HR', 'Litwa': 'LT',
  'Łotwa': 'LV', 'Estonia': 'EE',
}

const HEADERS = [
  'Spedytor', 'Nazwa towaru', 'Rodzaj opakowania', 'ADR', 'Uwagi',
  'ZL_RODZ', 'ID_OBCE', 'DATA', 'INFO_WEW', 'NR_ZAM_ZL',
  'ID_ZL', 'ID_OBCE_ZL', 'SKROT_ZL',
  'ID_PL', 'ID_OBCE_PL', 'SKROT_PL',
  'ID_P', 'ID_OBCE_P', 'SKROT_P',
  'SYMBOL_TYP_SAM', 'ID_SAM', 'NR_REJ_SAM',
  'ID_NAC', 'NR_REJ_NAC',
  'ID_PRZ', 'NR_REJ_PRZ', 'SAM_UWAGI',
  'ID_KIER1', 'NAZW_IMIE_KIER1', 'ID_KIER2', 'NAZW_IMIE_KIER2', 'KIER_UWAGI',
  'ID_USL', 'NAZWA_USL', 'ID_OBCE_USL', 'INFO_USL',
  'DK', 'P_WALUTA', 'CNETTO_ZAK', 'VAT_ZAK', 'ILOSC_ZAK', 'JM_ZAK',
  'FV', 'PL_WALUTA', 'CNETTO', 'VAT', 'ILOSC', 'JM',
  'DATA_ZAL', 'GODZ_ZAL', 'GODZ_DO_ZAL',
  'ID_ZAL', 'ID_OBCE_ZAL', 'SKROT_ZAL', 'NAZWA_ZAL', 'NIP_ZAL',
  'KOD_KRAJ_ZAL', 'KOD_ZAL', 'MIASTO_ZAL', 'ULICA_ZAL',
  'TELEFON_ZAL', 'NR_REF_ZAL', 'UWAGI_ZAL',
  'DATA_ROZ', 'GODZ_ROZ', 'GODZ_DO_ROZ',
  'ID_ROZ', 'ID_OBCE_ROZ', 'SKROT_ROZ', 'NAZWA_ROZ', 'NIP_ROZ',
  'KOD_KRAJ_ROZ', 'KOD_ROZ', 'MIASTO_ROZ', 'ULICA_ROZ',
  'TELEFON_ROZ', 'NR_REF_ROZ', 'UWAGI_ROZ',
  'TYP_LAD', 'INFO_TOW', 'WBRUTTO_TOW',
]

function fmtDate(d) {
  if (!d) return ''
  const s = typeof d === 'string' ? d.substring(0, 10) : ''
  return s.replace(/-/g, '')
}

function fmtTime(t) {
  if (!t) return ''
  return String(t).substring(0, 5)
}

function cc(kraj) {
  return COUNTRY_CODES[kraj] || (kraj && kraj.length === 2 ? kraj.toUpperCase() : 'DE')
}

function extractKg(wagaStr) {
  if (!wagaStr) return ''
  const s = String(wagaStr)
  const tonnes = s.match(/(\d+(?:[.,]\d+)?)\s*t\b/i)
  if (tonnes) return String(Math.round(parseFloat(tonnes[1].replace(',', '.')) * 1000))
  const kg = s.match(/(\d+(?:[.,]\d+)?)/)
  return kg ? kg[1].replace(',', '.') : ''
}

function shortName(name) {
  if (!name) return ''
  return String(name).substring(0, 15).trim()
}

function zlRodz(nrLeo) {
  const num = parseInt((nrLeo || '').replace(/[^0-9]/g, '') || '0')
  return (num >= 150 && num <= 154) ? 'T' : 'S'
}

function buildRow(z) {
  const zals = [...(z.zaladunki || [])].sort((a, b) => a.kolejnosc - b.kolejnosc)
  const rozs = [...(z.rozladunki || [])].sort((a, b) => a.kolejnosc - b.kolejnosc)
  const zal = zals[0] || {}
  const roz = rozs[rozs.length - 1] || rozs[0] || {}
  const k = z.kontrahenci || {}
  const f = z.flota || {}
  const kier = Array.isArray(f.kierowcy) ? f.kierowcy[0] : (f.kierowcy || {})
  const skrotZl = (k.nazwa || '').substring(0, 30)
  const infoTow = [z.ladunek_typ, z.ladunek_waga, z.ladunek_wymiary].filter(Boolean).join(' / ')

  return [
    z.spedytor || '',                              // 1  Spedytor
    z.ladunek_typ || '',                           // 2  Nazwa towaru
    z.palety_wymiana ? 'WYMIANA' : '',             // 3  Rodzaj opakowania
    z.adr ? 'TAK' : '',                           // 4  ADR
    z.rodzaj_zlecenia || '',                       // 5  Uwagi (GIEŁDA/KONTAKT)
    zlRodz(z.nr_leo),                             // 6  ZL_RODZ
    z.vrid || '',                                  // 7  ID_OBCE (nasz VRID)
    fmtDate(z.created_at),                         // 8  DATA
    '',                                            // 9  INFO_WEW
    z.numer_zlecenia || '',                        // 10 NR_ZAM_ZL
    '', '',                                        // 11-12 ID_ZL, ID_OBCE_ZL
    skrotZl,                                       // 13 SKROT_ZL
    '', '',                                        // 14-15 ID_PL, ID_OBCE_PL
    skrotZl,                                       // 16 SKROT_PL
    '', '',                                        // 17-18 ID_P, ID_OBCE_P
    'LEO-TRANS',                                   // 19 SKROT_P
    f.typ || '',                                   // 20 SYMBOL_TYP_SAM
    '',                                            // 21 ID_SAM
    f.rejestracja || '',                           // 22 NR_REJ_SAM
    '',                                            // 23 ID_NAC
    f.rejestracja_naczepa || '',                   // 24 NR_REJ_NAC
    '', '', '',                                    // 25-27 ID_PRZ, NR_REJ_PRZ, SAM_UWAGI
    '',                                            // 28 ID_KIER1
    kier.imie_nazwisko || '',                      // 29 NAZW_IMIE_KIER1
    '', '', '',                                    // 30-32 ID_KIER2, NAZW_IMIE_KIER2, KIER_UWAGI
    '',                                            // 33 ID_USL
    'USL. TRANSPORTOWA',                           // 34 NAZWA_USL
    '', '',                                        // 35-36 ID_OBCE_USL, INFO_USL
    'TAK',                                         // 37 DK
    'EUR',                                         // 38 P_WALUTA
    '',                                            // 39 CNETTO_ZAK (brak ceny zakupu)
    '23%',                                         // 40 VAT_ZAK
    '1',                                           // 41 ILOSC_ZAK
    'fracht',                                      // 42 JM_ZAK
    'TAK',                                         // 43 FV
    'EUR',                                         // 44 PL_WALUTA
    z.cena_eur != null ? String(z.cena_eur) : '',  // 45 CNETTO
    '23%',                                         // 46 VAT
    '1',                                           // 47 ILOSC
    'fracht',                                      // 48 JM
    fmtDate(zal.data),                             // 49 DATA_ZAL
    zal.ma_okno ? fmtTime(zal.okno_od) : '',       // 50 GODZ_ZAL
    zal.ma_okno ? fmtTime(zal.okno_do) : '',       // 51 GODZ_DO_ZAL
    '', '',                                        // 52-53 ID_ZAL, ID_OBCE_ZAL
    shortName(zal.nazwa_firmy),                    // 54 SKROT_ZAL
    zal.nazwa_firmy || '',                         // 55 NAZWA_ZAL
    '',                                            // 56 NIP_ZAL
    cc(zal.kraj),                                  // 57 KOD_KRAJ_ZAL
    zal.kod || '',                                 // 58 KOD_ZAL
    zal.miasto || '',                              // 59 MIASTO_ZAL
    zal.ulica || '',                               // 60 ULICA_ZAL
    zal.kontakt_telefon || '',                     // 61 TELEFON_ZAL
    zal.nr_ref || '',                              // 62 NR_REF_ZAL
    zal.dodatkowe_info || '',                      // 63 UWAGI_ZAL
    fmtDate(roz.data),                             // 64 DATA_ROZ
    roz.ma_okno ? fmtTime(roz.okno_od) : '',       // 65 GODZ_ROZ
    roz.ma_okno ? fmtTime(roz.okno_do) : '',       // 66 GODZ_DO_ROZ
    '', '',                                        // 67-68 ID_ROZ, ID_OBCE_ROZ
    shortName(roz.nazwa_firmy),                    // 69 SKROT_ROZ
    roz.nazwa_firmy || '',                         // 70 NAZWA_ROZ
    '',                                            // 71 NIP_ROZ
    cc(roz.kraj),                                  // 72 KOD_KRAJ_ROZ
    roz.kod || '',                                 // 73 KOD_ROZ
    roz.miasto || '',                              // 74 MIASTO_ROZ
    roz.ulica || '',                               // 75 ULICA_ROZ
    roz.kontakt_telefon || '',                     // 76 TELEFON_ROZ
    roz.nr_ref || '',                              // 77 NR_REF_ROZ
    roz.dodatkowe_info || '',                      // 78 UWAGI_ROZ
    '',                                            // 79 TYP_LAD
    infoTow,                                       // 80 INFO_TOW
    extractKg(z.ladunek_waga),                     // 81 WBRUTTO_TOW
  ]
}

export function exportSpedaXls(zlecenia, filename) {
  const rows = [HEADERS, ...zlecenia.map(buildRow)]
  const ws = XLSX.utils.aoa_to_sheet(rows)

  Object.keys(ws).forEach(key => {
    if (key.startsWith('!')) return
    ws[key] = { t: 's', v: ws[key].v != null ? String(ws[key].v) : '' }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Arkusz1')
  XLSX.writeFile(wb, filename || `SPEDA_${new Date().toISOString().slice(0, 10)}.xls`, { bookType: 'xls' })
}
