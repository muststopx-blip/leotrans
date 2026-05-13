# SETUP — Konfiguracja środowiska deweloperskiego

---

## Wymagania

- **Node.js** >= 18 (https://nodejs.org)
- **Git**
- **VS Code** (zalecane) lub dowolny edytor

---

## 1. Klonowanie repozytorium

```bash
git clone https://github.com/muststopx-blip/leotrans.git
cd leotrans
```

---

## 2. Frontend (React + Vite)

```bash
cd aplikacja/leo.app
npm install
```

### Plik .env.local

Stwórz plik `aplikacja/leo.app/.env.local` (poproś Macieja o wartości):

```env
VITE_SUPABASE_URL=https://zfpqoslxvzblzqkhrqyg.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key z Supabase Dashboard>
```

**Klucz anon key pobierz z:** Supabase Dashboard → projekt `zfpqoslxvzblzqkhrqyg` → Settings → API → `anon public`

### Uruchomienie dev server

```bash
npm run dev
# → http://localhost:5173
# → sieć: http://<twoje-IP>:5173 (dla telefonu w tej samej sieci)
```

### Login testowy

| Email | Hasło |
|-------|-------|
| muststopx@gmail.com | LeoTrans2026! |

Uwaga: przy logowaniu wymagane jest OTP. W trybie dev (bez Resend) kod OTP pojawia się w:
- Supabase Dashboard → Edge Functions → send-otp → Logs
- Szukaj: `[OTP DEV] email@...: 123456`

---

## 3. Supabase — baza danych

### Projekt
- **ID:** zfpqoslxvzblzqkhrqyg
- **URL:** https://zfpqoslxvzblzqkhrqyg.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/zfpqoslxvzblzqkhrqyg

### Dostęp
Poproś Macieja o zaproszenie do projektu Supabase lub użyj PAT.

### Migracje (jeśli ustawiasz świeżą bazę)
Migracje są w folderze `supabase/migrations/`. Wykonaj je w kolejności w SQL Editore:
- 001 → 011 (w numerycznej kolejności)

**Migracja 004 jest KRYTYCZNA** i musi być uruchomiona — dodaje polisy SELECT dla authenticated users na załadunki/rozładunki/kontrahenci/flota.

---

## 4. Edge Functions (Supabase Deno)

### Wymagania
- Supabase CLI: `npm install -g supabase` lub użyj `npx supabase`
- Personal Access Token (PAT): https://supabase.com/dashboard/account/tokens

### Deploy pojedynczej funkcji

```powershell
$env:SUPABASE_ACCESS_TOKEN="<twój PAT>"
npx supabase functions deploy <nazwa-funkcji> --project-ref zfpqoslxvzblzqkhrqyg
```

Funkcje (folder `supabase/functions/`):
- `ocr-zlecenie` — OCR PDF → JSON
- `save-zlecenie` — zapis zlecenia do DB
- `enrich-zlecenie` — analiza AI w tle + SpedTrans output
- `send-otp` — wysyłka kodu OTP
- `verify-otp` — weryfikacja kodu OTP

### Sekrety Edge Functions

Ustaw w: Supabase Dashboard → Settings → Edge Functions → Secrets

| Secret | Opis | Gdzie wziąć |
|--------|------|-------------|
| `GEMINI_API_KEY` | Klucz Google Gemini | console.cloud.google.com |
| `RESEND_API_KEY` | Klucz Resend (email OTP) | resend.com (opcjonalne) |
| `ANTHROPIC_API_KEY` | Klucz Claude AI (wiadomość dla kierowcy) | console.anthropic.com |
| `SUPABASE_URL` | URL projektu Supabase | automatycznie wstrzykiwane |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Supabase Dashboard → Settings → API |

---

## 5. Deploy na produkcję (FTP home.pl)

```bash
cd aplikacja/leo.app
npm run build
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

`deploy.ps1` uploaduje folder `dist/` na FTP:
- Host: serwer2657672.home.pl
- Remote: /public_html/

---

## 6. Struktura plików

```
leotrans/
├── xxx/                        # ← ta dokumentacja
├── aplikacja/
│   └── leo.app/
│       ├── src/
│       │   ├── App.jsx         # główny komponent (formularz, historia, flota)
│       │   ├── Login.jsx       # ekran logowania
│       │   ├── OtpVerify.jsx   # ekran OTP
│       │   ├── OrderDetail.jsx # panel podglądu zlecenia
│       │   ├── spedaExport.js  # generator XLS SpedTrans (81 kolumn)
│       │   └── index.css       # Tailwind + custom klasy
│       ├── .env.local          # ← NIE w git (stwórz lokalnie)
│       ├── deploy.ps1          # upload FTP → home.pl
│       └── package.json
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── prompts.ts          # prompty AI (OCR, wiadomość kierowcy)
│   │   │   ├── cors.ts             # CORS helpers
│   │   │   └── convert-to-jpg.ts  # konwersja PDF→JPG
│   │   ├── ocr-zlecenie/index.ts
│   │   ├── save-zlecenie/index.ts
│   │   ├── enrich-zlecenie/index.ts
│   │   ├── send-otp/index.ts
│   │   └── verify-otp/index.ts
│   └── migrations/
│       ├── 001_init.sql
│       ├── 002_users_amazon_enrichment.sql
│       ├── 003_stoly_auth.sql
│       ├── 004_auth_select_policies.sql  ← KRYTYCZNA, uruchom jeśli nie działa SPEDA
│       ├── 005-011_*.sql
│       └── 20260511_flota_import.sql     ← import danych floty
├── n8n/
│   └── leoleo2 (1).json        # stara automatyzacja n8n (archiwum)
├── zlecenia_testowe/           # testowe PDFy do OCR
└── CLAUDE.md                   # instrukcje dla AI (Claude Code)
```

---

## 7. Dodanie nowego spedytora

1. Supabase Dashboard → Authentication → Users → **Create User**
   - Email + hasło
   - Trigger automatycznie tworzy rekord w tabeli `profile`

2. Table Editor → `profile` → znajdź nowy rekord → ustaw:
   - `imie_nazwisko`, `inicjaly`, `rola` ('spedytor' lub 'admin')
   - opcjonalnie: `stol_id` (UUID stołu)

Lista 28 pracowników: arkusz Google Sheets (poproś Macieja o link)
