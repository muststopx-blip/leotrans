import * as XLSX from 'xlsx'

const COUNTRY_CODES = {
  'Niemcy': 'DE', 'Polska': 'PL', 'Francja': 'FR', 'Włochy': 'IT',
  'Hiszpania': 'ES', 'Austria': 'AT', 'Czechy': 'CZ', 'Holandia': 'NL',
  'Belgia': 'BE', 'Szwecja': 'SE', 'Dania': 'DK', 'Norwegia': 'NO',
  'Szwajcaria': 'CH', 'Portugalia': 'PT', 'Węgry': 'HU', 'Rumunia': 'RO',
  'Słowacja': 'SK', 'Słowenia': 'SI', 'Chorwacja': 'HR', 'Litwa': 'LT',
  'Łotwa': 'LV', 'Estonia': 'EE',
}

const SPEDA_HEADERS = [
  'Spedytor', '', 'Nazwa towaru', 'Rodzaj opakowania', 'ADR', 'Uwagi',
  'ZL_RODZ', 'ID_OBCE', 'DATA', 'INFO_WEW', 'NR_ZAM_ZL', 'ID_ZL', 'ID_OBCE_ZL', 'SKROT_ZL',
  'ID_PL', 'ID_OBCE_PL', 'SKROT_PL', 'ID_P', 'ID_OBCE_P', 'SKROT_P', 'SYMBOL_TYP_SAM',
  'ID_SAM', 'NR_REJ_SAM', 'ID_NAC', 'NR_REJ_NAC', 'ID_PRZ', 'NR_REJ_PRZ', 'SAM_UWAGI',
  'ID_KIER1', 'NAZW_IMIE_KIER1', 'ID_KIER2', 'NAZW_IMIE_KIER2', 'KIER_UWAGI',
  'ID_USL', 'NAZWA_USL', 'ID_OBCE_USL', 'INFO_USL', 'DK', 'P_WALUTA', 'CNETTO_ZAK',
  'VAT_ZAK', 'ILOSC_ZAK', 'JM_ZAK', 'FV', 'PL_WALUTA', 'CNETTO', 'VAT', 'ILOSC', 'JM',
  'DATA_ZAL', 'GODZ_ZAL', 'GODZ_DO_ZAL', 'ID_ZAL', 'ID_OBCE_ZAL', 'SKROT_ZAL',
  'NAZWA_ZAL', 'NIP_ZAL', 'KOD_KRAJ_ZAL', 'KOD_ZAL', 'MIASTO_ZAL', 'ULICA_ZAL',
  'TELEFON_ZAL', 'NR_REF_ZAL', 'UWAGI_ZAL',
  'DATA_ROZ', 'GODZ_ROZ', 'GODZ_DO_ROZ', 'ID_ROZ', 'ID_OBCE_ROZ', 'SKROT_ROZ',
  'NAZWA_ROZ', 'NIP_ROZ', 'KOD_KRAJ_ROZ', 'KOD_ROZ', 'MIASTO_ROZ', 'ULICA_ROZ',
  'TELEFON_ROZ', 'NR_REF_ROZ', 'UWAGI_ROZ',
  'TYP_LAD', 'INFO_TOW', 'WBRUTTO_TOW', 'MJSC_PLT_TOW', 'OBJ_TOW', 'DLUGOSC_TOW',
  'FORMA_DOST', 'FORMA_DOST_UWAGI', 'INSTR_ZLEC', 'WYMAGANIA', 'INSTRUKCJE',
  'ZL_WARUNKI', 'P_WARUNKI',
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

function countryCode(kraj) {
  return COUNTRY_CODES[kraj] || kraj || 'DE'
}

function extractWaga(wagaStr) {
  if (!wagaStr) return ''
  const m = String(wagaStr).match(/[\d]+([.,][\d]+)?/)
  return m ? m[0].replace(',', '.') : ''
}

function zlecenieTo92(zlecenie) {
  const zals = [...(zlecenie.zaladunki || [])].sort((a, b) => a.kolejnosc - b.kolejnosc)
  const rozs = [...(zlecenie.rozladunki || [])].sort((a, b) => a.kolejnosc - b.kolejnosc)
  const zal = zals[0] || {}
  const roz = rozs[rozs.length - 1] || rozs[0] || {}
  const k = zlecenie.kontrahenci || {}
  const f = zlecenie.flota || {}
  const kier = Array.isArray(f.kierowcy) ? f.kierowcy[0] : (f.kierowcy || {})

  const row = new Array(92).fill('')

  // Indeksy są 0-based, kolumny SPEDA 1-based → idx = kol - 1
  row[0] = zlecenie.spedytor || ''                            // kol 1: Spedytor
  row[2] = zlecenie.ladunek_typ || ''                         // kol 3: Nazwa towaru
  row[3] = zlecenie.palety_wymiana ? 'PALETY' : ''           // kol 4: Rodzaj opakowania
  row[4] = zlecenie.adr ? 'TAK' : ''                         // kol 5: ADR
  row[5] = [
    zlecenie.lift ? 'LIFT' : '',
    zlecenie.wylot_granica ? `Wyjazd: ${zlecenie.wylot_przejscie || ''}` : '',
    zlecenie.powrot_granica ? `Powrót: ${zlecenie.powrot_przejscie || ''}` : '',
  ].filter(Boolean).join(', ')                               // kol 6: Uwagi
  row[6] = 'S'                                                // kol 7: ZL_RODZ
  row[7] = zlecenie.numer_zlecenia || zlecenie.vrid || ''     // kol 8: ID_OBCE
  row[8] = fmtDate(zlecenie.created_at)                       // kol 9: DATA
  row[9] = zlecenie.vrid || ''                                 // kol 10: INFO_WEW
  row[10] = zlecenie.numer_zlecenia || ''                      // kol 11: NR_ZAM_ZL
  row[13] = (k.nazwa || '').substring(0, 30)                  // kol 14: SKROT_ZL
  row[16] = (k.nazwa || '').substring(0, 30)                  // kol 17: SKROT_PL
  row[19] = 'LEO-TRANS'                                       // kol 20: SKROT_P
  row[22] = f.rejestracja || ''                               // kol 23: NR_REJ_SAM
  row[24] = f.rejestracja_naczepa || ''                       // kol 25: NR_REJ_NAC
  row[29] = kier.imie_nazwisko || ''                          // kol 30: NAZW_IMIE_KIER1
  row[34] = 'USŁ. TRANSPORTOWA'                              // kol 35: NAZWA_USL
  row[37] = 'TAK'                                             // kol 38: DK
  row[38] = 'EUR'                                             // kol 39: P_WALUTA
  row[40] = '23%'                                             // kol 41: VAT_ZAK
  row[41] = '1'                                               // kol 42: ILOSC_ZAK
  row[42] = 'fracht'                                          // kol 43: JM_ZAK
  row[43] = 'TAK'                                             // kol 44: FV
  row[44] = 'EUR'                                             // kol 45: PL_WALUTA
  row[45] = zlecenie.cena_eur != null ? String(zlecenie.cena_eur) : ''  // kol 46: CNETTO
  row[46] = '23%'                                             // kol 47: VAT
  row[47] = '1'                                               // kol 48: ILOSC
  row[48] = 'fracht'                                          // kol 49: JM
  row[49] = fmtDate(zal.data)                                 // kol 50: DATA_ZAL
  row[50] = zal.ma_okno ? fmtTime(zal.okno_od) : ''          // kol 51: GODZ_ZAL
  row[51] = zal.ma_okno ? fmtTime(zal.okno_do) : ''          // kol 52: GODZ_DO_ZAL
  row[55] = zal.nazwa_firmy || ''                             // kol 56: NAZWA_ZAL
  row[56] = k.nip || ''                                      // kol 57: NIP_ZAL
  row[57] = countryCode(zal.kraj)                            // kol 58: KOD_KRAJ_ZAL
  row[58] = zal.kod || ''                                    // kol 59: KOD_ZAL
  row[59] = zal.miasto || ''                                 // kol 60: MIASTO_ZAL
  row[60] = zal.ulica || ''                                  // kol 61: ULICA_ZAL
  row[62] = zal.nr_ref || ''                                 // kol 63: NR_REF_ZAL
  row[64] = fmtDate(roz.data)                                 // kol 65: DATA_ROZ
  row[65] = roz.ma_okno ? fmtTime(roz.okno_od) : ''          // kol 66: GODZ_ROZ
  row[66] = roz.ma_okno ? fmtTime(roz.okno_do) : ''          // kol 67: GODZ_DO_ROZ
  row[70] = roz.nazwa_firmy || ''                             // kol 71: NAZWA_ROZ
  row[72] = countryCode(roz.kraj)                            // kol 73: KOD_KRAJ_ROZ
  row[73] = roz.kod || ''                                    // kol 74: KOD_ROZ
  row[74] = roz.miasto || ''                                 // kol 75: MIASTO_ROZ
  row[75] = roz.ulica || ''                                  // kol 76: ULICA_ROZ
  row[77] = roz.nr_ref || ''                                 // kol 78: NR_REF_ROZ
  row[79] = zlecenie.ladunek_typ || ''                        // kol 80: TYP_LAD
  row[80] = [zlecenie.ladunek_typ, zlecenie.ladunek_waga, zlecenie.ladunek_wymiary]
    .filter(Boolean).join(' / ')                              // kol 81: INFO_TOW
  row[81] = extractWaga(zlecenie.ladunek_waga)                // kol 82: WBRUTTO_TOW
  row[82] = zlecenie.palety_ilosc != null ? String(zlecenie.palety_ilosc) : ''  // kol 83: MJSC_PLT_TOW

  return row
}

export function exportSpedaXls(zlecenia, filename) {
  const rows = [SPEDA_HEADERS, ...zlecenia.map(zlecenieTo92)]
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Force all cells to text type
  Object.keys(ws).forEach(key => {
    if (key.startsWith('!')) return
    ws[key] = { t: 's', v: ws[key].v != null ? String(ws[key].v) : '' }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Arkusz1')
  XLSX.writeFile(wb, filename || `SPEDA_${new Date().toISOString().slice(0, 10)}.xls`, { bookType: 'xls' })
}
