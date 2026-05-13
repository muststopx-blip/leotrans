# PROGRAMY FIRMOWE — Opis oprogramowania Leo-Trans

---

## 1. SpedTrans (TMS — Transport Management System)

Program do zarządzania zleceniami transportowymi zainstalowany w biurze Leo-Trans.

### Import zleceń
SpedTrans pobiera zlecenia z pliku XLS (Excel). Nasz system generuje ten plik automatycznie po każdym zapisanym zleceniu.

**Format pliku:** 81 kolumn, wszystkie TEXT, separator TAB, kodowanie Windows-1250  
**Generowanie:** `aplikacja/leo.app/src/spedaExport.js` (SheetJS)  
**Tabela DB:** `spedtrans_output` (wypełniana przez enrich-zlecenie w tle)

### Kluczowe kolumny SpedTrans

| Kolumna | Co wpisujemy | Źródło |
|---------|-------------|--------|
| ZL_RODZ | S (spedycja) lub T (transport) | S domyślnie, T dla LEO-150..154 |
| ID_OBCE | nasz VRID | AI2026/05/00001 |
| DATA | data zlecenia | YYYYMMDD |
| NR_ZAM_ZL | numer zlecenia od klienta | formularz |
| SKROT_ZL | skrót nazwy kontrahenta (≤30 znaków) | `kontrahenci.nazwa` z bazy |
| SKROT_PL | skrót płatnika = SKROT_ZL | j.w. |
| SKROT_P | skrót przewoźnika | zawsze "LEO-TRANS" |
| NR_REJ_SAM | rejestracja ciągnika | `flota.rejestracja` |
| NR_REJ_NAC | rejestracja naczepy | `flota.rejestracja_naczepa` |
| NAZW_IMIE_KIER1 | kierowca | `kierowcy.imie_nazwisko` |
| DK | dokument kosztowy | zawsze "TAK" |
| FV | faktura VAT | zawsze "TAK" |
| CNETTO | cena frachtu | `zlecenia.cena_eur` |
| DATA_ZAL | data załadunku | YYYYMMDD |
| GODZ_ZAL/DO | okno czasowe załadunku | HH:mm |
| SKROT_ZAL | krótka nazwa miejsca załadunku | pierwsze 15 znaków z nazwa_firmy |
| NAZWA_ZAL | pełna nazwa firmy załadunku | `zaladunki[0].nazwa_firmy` |
| KOD_KRAJ_ZAL | kod kraju załadunku | DE, PL, CZ itd. |
| KOD_ZAL | kod pocztowy załadunku | |
| NR_REF_ZAL | nr referencyjny załadunku | `zaladunki[0].nr_ref` |
| UWAGI_ZAL | dodatkowe info załadunku | `zaladunki[0].dodatkowe_info` |
| DATA_ROZ | data rozładunku (ostatni stop) | YYYYMMDD |
| NAZWA_ROZ | firma rozładunku | `rozladunki[-1].nazwa_firmy` |
| WBRUTTO_TOW | waga towaru w kg | wyekstrahowane z `ladunek_waga` |

**Pola puste (wypełniane przez SpedTrans automatycznie po nr rej):**
ID_ZL, ID_SAM, ID_KIER1, ID_ROZ itd.

### SKROT_ZL — jak działa porównywarka

SpedTrans ma własną bazę kontrahentów ze skróconymi nazwami. Żeby SKROT_ZL pasował do bazy SpedTrans, system szuka kontrahenta w naszej tabeli `kontrahenci`:

1. Jeśli zlecenie ma `kontrahent_id` (powiązany kontrahent) → używa `kontrahenci.nazwa` (≤30 znaków)
2. Fallback: szuka po `nazwa ILIKE '%<nazwa_z_OCR>%'` + match kodu pocztowego
3. Ostateczny fallback: nazwa z OCR obcięta do 30 znaków

---

## 2. Resend (email OTP)

Serwis do wysyłania emaili z kodami OTP do logowania 2FA.

**Status:** domena leo-trans.pl jeszcze niezweryfikowana → kody OTP lądują w logach Supabase  
**Do zrobienia:** zweryfikować domenę w resend.com → Domains → Add Domain → dodać TXT/MX rekordy DNS

**Jak sprawdzić kod OTP bez Resend:**
1. Supabase Dashboard → Edge Functions → send-otp → Logs
2. Szukaj: `[OTP DEV] email@...: 123456`

---

## 3. Supabase (baza i backend)

Hostowana baza PostgreSQL + Auth + Storage + Edge Functions (Deno).

- **URL:** https://zfpqoslxvzblzqkhrqyg.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/zfpqoslxvzblzqkhrqyg
- **Storage:** bucket `pdfs` (oryginalne pliki PDF zleceń)
- **Auth:** email + hasło + OTP

---

## 4. Google Gemini (AI OCR + Analiza)

AI model używany do czytania PDF zleceń.

**Model:** `gemini-2.5-flash` (najnowszy, 2026)  
**Użycie:**
- `ocr-zlecenie`: thinkingBudget=0 (szybki, ~5s)
- `enrich-zlecenie`: thinkingBudget=24576 (głęboka analiza, ~30-90s)

**Klucz:** GEMINI_API_KEY w Supabase Secrets  
**Konsola:** console.cloud.google.com → Google AI Studio

---

## 5. Claude (Anthropic) — wiadomość dla kierowcy

Model Claude Haiku 4.5 generuje wiadomość dla kierowcy na podstawie danych zlecenia.

**Używany w:** `enrich-zlecenie` (tło)  
**Prompt:** `PROMPT_DRIVER_MESSAGE` w `supabase/functions/_shared/prompts.ts`  
**Klucz:** ANTHROPIC_API_KEY w Supabase Secrets

---

## 6. GBox (GPS — w planach)

Urządzenia GPS zamontowane w ciężarówkach. Firma ma dostęp do panelu GBox.

**Status:** Do implementacji  
**Plan:**
- Dodać pole `gbox_device_id` w tabeli `flota`
- Formularz dodawania pojazdu z polem na ID urządzenia
- Zakładka "Mapa" w module Flota — live pozycje przez GBox API
- Mapa bazuje na TomTom Maps API (darmowy tier — 2500 req/dzień)

**Do zrobienia przez Macieja:** zalogować się do panelu GBox i znaleźć API token (Settings → API lub Integracje).

---

## 7. n8n (stara automatyzacja — archiwum)

Plik: `n8n/leoleo2 (1).json`

Stary workflow używający n8n, Google Drive, Gemini i Azure GPT-4o.  
**Zastąpiony** przez aktualny system. Plik zachowany dla referencji.

---

## 8. home.pl (hosting frontu)

Aplikacja React jest hostowana na serwerze FTP home.pl.

- **Host:** serwer2657672.home.pl
- **Remote:** /public_html/
- **Deploy:** `npm run build && powershell -File deploy.ps1`

Serwer nie obsługuje Node.js — serwuje tylko statyczne pliki (React SPA).  
Wszystkie API trafiają bezpośrednio do Supabase (brak własnego backendu).
