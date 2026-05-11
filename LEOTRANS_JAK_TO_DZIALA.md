# LEOTRANS — Jak to działa (pełna dokumentacja)

**Projekt:** LEO-TRANS MACIEJ LEW SPÓŁKA KOMANDYTOWA, Milicz  
**Stack:** React + Vite + Tailwind | Supabase Edge Functions (Deno) | Gemini 2.5 Flash AI  
**Dev server:** `http://localhost:5175` (uruchom: `cd aplikacja/leo.app && npm run dev`)

---

## Konto testowe (admin)

| Email | Hasło |
|-------|-------|
| muststopx@gmail.com | LeoTrans2026! |

---

## Architektura systemu

```
Przeglądarka (React)
    │
    ├── logowanie → Supabase Auth (email + hasło)
    ├── OTP → Edge Function: send-otp → Resend email (lub logi)
    │                        verify-otp → sprawdza hash w DB
    │
    ├── wgranie PDF → Edge Function: ocr-zlecenie → Gemini 2.5 Flash
    │                                             → Supabase Storage (bucket: pdfs)
    │
    ├── zapis zlecenia → Edge Function: save-zlecenie → PostgreSQL
    │                                   ↓ (fire & forget)
    │                                   enrich-zlecenie → Gemini (wiadomość dla kierowcy)
    │
    └── historia / flota → Supabase REST API (bezpośrednio z przeglądarki)
```

---

## Logowanie (2-etapowe)

### Krok 1 — Email + hasło
- Frontend → `POST /auth/v1/token?grant_type=password`
- Supabase sprawdza credentials
- Sukces → dostaje `access_token` (JWT) + `user` (id, email)
- Token zapisywany tymczasowo w pamięci (nie w localStorage jeszcze)

### Krok 2 — OTP
- Frontend wysyła `POST /functions/v1/send-otp` z `Authorization: Bearer <token>`
- Edge function `send-otp`:
  - Weryfikuje token użytkownika
  - Generuje 6-cyfrowy kod losowy
  - Hashuje go SHA-256 i zapisuje do tabeli `otp_codes` (ważny 5 minut)
  - Wysyła email przez **Resend** (jeśli brak `RESEND_API_KEY` → wypisuje kod do logów Dashboard)
- Użytkownik wpisuje kod
- Frontend → `POST /functions/v1/verify-otp` z kodem
- Edge function `verify-otp` sprawdza hash w DB, oznacza kod jako użyty
- Sukces → token zapisywany do `localStorage` jako `leo_session`

### Sesja
- Przy odświeżeniu strony: sprawdza `localStorage.leo_session` + `exp` tokena
- Jeśli wygasła → powrót do logowania
- Wylogowanie → usuwa `leo_session` z localStorage

---

## Wgrywanie zlecenia (OCR)

1. Spedytor wybiera PDF zlecenia
2. Frontend → `POST /functions/v1/ocr-zlecenie` (multipart/form-data z plikiem PDF)
3. Edge function:
   - Upload PDF do Supabase Storage bucket `pdfs`
   - Pobiera PDF jako base64
   - Wysyła do **Gemini 2.5 Flash** (`gemini-2.5-flash-preview-05-20`) z promptem ekstrakcji
   - Gemini zwraca JSON: numer zlecenia, kontrahent, NIP, cena EUR, załadunki, rozładunki, ładunek
   - Sprawdza czy kontrahent (NIP) istnieje w tabeli `kontrahenci` → jeśli nie, tworzy
4. Frontend wypełnia formularz danymi z Gemini (edytowalne)

---

## Formularz zlecenia

Pola:
- **ZLECENIE NA** (solo/stół) — widoczne tylko gdy spedytor należy do stołu
- Rodzaj zlecenia (GIEŁDA / KONTAKT)
- Spedytor (auto-fill z profilu użytkownika)
- NR LEO (datalist z floty)
- KM, cena EUR, numer zlecenia
- Checkboxy: WYLOT GRANICA, POWRÓT GRANICA, PALETY WYMIANA, ADR, LIFT
- Kontrahent
- Załadunki (wielokrotne): kod, ulica, miasto, kraj, data, okno czasowe, nr ref
- Rozładunki (wielokrotne): j.w.
- Ładunek: typ, waga, wymiary

Po prawej stronie: **wiadomość dla kierowcy** — generuje się na bieżąco z formularza, można edytować i skopiować do WhatsApp.

---

## Zapis zlecenia

1. Frontend → `POST /functions/v1/save-zlecenie` z pełnym payloadem
2. Edge function:
   - Generuje VRID (format: `AI2026/05/00001`, auto-increment per miesiąc)
   - Zapisuje zlecenie do tabeli `zlecenia`
   - Zapisuje załadunki → tabela `zaladunki`
   - Zapisuje rozładunki → tabela `rozladunki`
   - Fire-and-forget: wywołuje `enrich-zlecenie` w tle
3. `enrich-zlecenie`:
   - Pobiera dane zlecenia
   - Wysyła do Gemini → generuje profesjonalną wiadomość dla kierowcy
   - Aktualizuje pole `wiadomosc_dla_kierowcy` w tabeli `zlecenia`

---

## System stołów (grupy robocze)

**Tabele:** `stoly` (id, nazwa, skrot), `profile.stol_id`

- Spedytor może należeć do "stołu" (grupy ~3 osób)
- Przy tworzeniu zlecenia: toggle **SOLO** (inicjały spedytora) lub **STÓŁ** (nazwa/skrót stołu)
- `rodzaj_spedytora` = 'solo' lub 'stol' w tabeli `zlecenia`
- W eksporcie SpedTrans: pole `spedytor` to albo inicjały (solo) albo skrót stołu

**RLS na zleceniach:**
- Admin widzi wszystko
- Spedytor widzi swoje zlecenia (`created_by = auth.uid()`) + zlecenia swojego stołu

---

## Baza danych (Supabase — projekt: zfpqoslxvzblzqkhrqyg)

### Kluczowe tabele

| Tabela | Opis |
|--------|------|
| `profile` | Konta spedytorów: id (= auth.uid), imie_nazwisko, inicjaly, rola, stol_id |
| `stoly` | Stoły robocze: id, nazwa, skrot |
| `zlecenia` | Główna tabela zleceń z VRID |
| `zaladunki` | Punkty załadunku (jeden-wiele do zlecenia) |
| `rozladunki` | Punkty rozładunku |
| `kontrahenci` | Baza firm (NIP jako unikalny klucz) |
| `flota` | Pojazdy: nr_leo, typ, marka, rejestracja |
| `kierowcy` | Kierowcy przypisani do floty |
| `otp_codes` | Kody OTP: user_id, code_hash (SHA-256), expires_at, used |
| `zlecenia_full` | Widok JOIN: zlecenia + kontrahenci + flota + profile + stoly |

### Identyfikator VRID
Format: `AI{YYYY}/{MM}/{NNNNN}` — sekwencja auto-increment per miesiąc  
Przykład: `AI2026/05/00001`

---

## Edge Functions (Supabase, Deno TypeScript)

| Funkcja | Opis |
|---------|------|
| `ocr-zlecenie` | PDF → Gemini OCR → JSON z danymi zlecenia |
| `save-zlecenie` | Zapis zlecenia do DB + VRID + fire-and-forget enrich |
| `enrich-zlecenie` | Gemini generuje wiadomość dla kierowcy w tle |
| `send-otp` | Generuje i wysyła kod OTP (email przez Resend) |
| `verify-otp` | Weryfikuje kod OTP (sprawdza hash w DB) |

**Deploy:** `.\supabase.exe functions deploy <nazwa> --project-ref zfpqoslxvzblzqkhrqyg`

---

## Zmienne środowiskowe Edge Functions

Ustaw w Supabase Dashboard → Settings → Edge Functions → Secrets:

| Zmienna | Wartość |
|---------|---------|
| `GEMINI_API_KEY` | AIzaSyDmutVXtTx4AYieM3Os9KH5P4EGW2gD4VQ |
| `RESEND_API_KEY` | (opcjonalnie — bez tego OTP idzie do logów) |
| `SUPABASE_URL` | https://zfpqoslxvzblzqkhrqyg.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role JWT z Dashboard → Settings → API) |

---

## Zmienne środowiskowe Frontend

Plik: `aplikacja/leo.app/.env.local`

```
VITE_SUPABASE_URL=https://zfpqoslxvzblzqkhrqyg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Jak dodać nowego użytkownika (spedytora)

1. **Supabase Dashboard → Authentication → Users → Create User**
   - Wpisz email + hasło
   - Trigger automatycznie tworzy rekord w tabeli `profile`

2. **Supabase Dashboard → Table Editor → profile**
   - Znajdź nowy rekord (po email z auth.users)
   - Ustaw `imie_nazwisko`, `inicjaly`, `rola` ('spedytor' lub 'admin')
   - Opcjonalnie: `stol_id` (UUID stołu z tabeli `stoly`)

3. Spedytor loguje się na stronie email + hasło + OTP

---

## Jak dodać stół

1. **Supabase Dashboard → Table Editor → stoly → Insert Row**
   - `nazwa`: np. "Stół 1", "Stół Export"
   - `skrot`: np. "S1", "EXP"

2. Przypisz spedytorów: w tabeli `profile` ustaw `stol_id` = UUID stołu

---

## Odczytywanie kodów OTP (bez Resend)

Jeśli `RESEND_API_KEY` nie jest ustawiony, kody OTP trafiają do logów:

**Supabase Dashboard → Edge Functions → send-otp → Logs**

Szukaj linii: `[OTP DEV] email@domena.pl: 123456`

---

## Pliki projektu

```
C:\nexus\
├── aplikacja/leo.app/          # Frontend React
│   └── src/
│       ├── App.jsx             # Główny komponent (formularze, historia, flota)
│       ├── Login.jsx           # Ekran logowania (email + hasło)
│       ├── OtpVerify.jsx       # Ekran weryfikacji OTP
│       └── supabase.js         # Klient Supabase
├── supabase/
│   ├── functions/
│   │   ├── ocr-zlecenie/       # OCR: PDF → Gemini → JSON
│   │   ├── save-zlecenie/      # Zapis zlecenia + VRID
│   │   ├── enrich-zlecenie/    # Wiadomość dla kierowcy (tło)
│   │   ├── send-otp/           # Wysyłka kodu OTP
│   │   └── verify-otp/         # Weryfikacja kodu OTP
│   └── migrations/
│       ├── 001_init.sql        # Tabele: flota, kierowcy, kontrahenci, zlecenia...
│       ├── 002_profile.sql     # Tabela profile + RLS
│       └── 003_stoly_auth.sql  # Tabele: stoly, otp_codes + RLS + widok
└── supabase.exe                # Supabase CLI
```
