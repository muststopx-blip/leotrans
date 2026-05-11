# LEOTRANS - System zarządzania zleceniami transportowymi
**Firma:** LEO-TRANS MACIEJ LEW SPÓŁKA KOMANDYTOWA, Milicz  
**Powered by:** Mediafy  
**Stack:** React + Vite + Tailwind | Python FastAPI | Supabase | Claude AI

---

## Cel systemu

Automatyzacja obiegu zleceń transportowych:
1. Spedytor wgrywa PDF ze zleceniem (od kontrahenta)
2. Claude AI wyciąga dane (OCR + analiza) → zwraca JSON
3. Spedytor weryfikuje formularz i ewentualnie koryguje
4. System generuje wiadomość dla kierowcy (kopiuj → WhatsApp)
5. Zlecenie zapisuje się do bazy z unikalnym VRID
6. Eksport do SPEDA (XLS)

---

## Architektura

```
Frontend (React)  ──►  Backend (FastAPI/Python)  ──►  Supabase DB
      │                        │
      │                        ├──► Claude AI (OCR PDF → JSON)
      │                        ├──► Supabase Storage (PDF backup)
      │                        └──► SPEDA export (XLS)
      │
      └──►  Supabase (bezpośrednie zapytania przez supabase-js)
```

### Komponenty

| Komponent | Technologia | Lokalizacja |
|-----------|------------|-------------|
| Frontend | React 19, Vite, Tailwind | `aplikacja/leo.app/` |
| Backend API | Python FastAPI | `app.py` / `main.py` |
| Baza danych | Supabase (PostgreSQL) | Supabase cloud |
| Storage PDF | Supabase Storage | bucket: `zlecenia` |
| AI OCR | Claude claude-sonnet-4-6 | Anthropic API |
| AI wiadomość | Claude claude-sonnet-4-6 | Anthropic API |

---

## Baza danych (Supabase)

### Tabela: `flota`
```sql
id          UUID PK
nr_leo      TEXT UNIQUE          -- 'LEO-144', 'LEO-089' itp.
typ         TEXT                 -- 'Plandeka 13.6m', 'Chłodnia', 'Firanka'
marka       TEXT                 -- 'Scania R450', 'Volvo FH16'
rejestracja TEXT                 -- nr rejestracyjny ciągnika
rejestracja_naczepa TEXT
status      TEXT DEFAULT 'available'  -- 'available'|'busy'|'service'
created_at  TIMESTAMPTZ DEFAULT now()
```

### Tabela: `kierowcy`
```sql
id              UUID PK
imie_nazwisko   TEXT
telefon         TEXT
nr_leo          TEXT FK -> flota(nr_leo)
aktywny         BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
```

### Tabela: `kontrahenci`
```sql
id              UUID PK
nazwa           TEXT
nip             TEXT UNIQUE          -- PL9161394799, DE335983206 itp.
adres_ulica     TEXT
adres_kod       TEXT
adres_miasto    TEXT
kraj            TEXT DEFAULT 'PL'
email           TEXT
telefon         TEXT
uwagi           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### Tabela: `zlecenia` (główna)
```sql
id                    UUID PK DEFAULT gen_random_uuid()
vrid                  TEXT UNIQUE          -- AI{YYYY}/{MM}/{NNNNN} np. AI2026/04/00001
numer_zlecenia        TEXT                 -- numer od kontrahenta
kontrahent_id         UUID FK -> kontrahenci
spedytor              TEXT                 -- inicjały/imię
nr_leo                TEXT FK -> flota(nr_leo)
data_przyjecia        DATE DEFAULT today()
rodzaj_zlecenia       TEXT DEFAULT 'GIEŁDA'  -- 'GIEŁDA'|'KONTAKT'
cena_eur              DECIMAL(10,2)
km                    INTEGER
status                TEXT DEFAULT 'nowe'  -- 'nowe'|'w_trasie'|'zakonczone'|'anulowane'
pdf_url               TEXT                 -- link Supabase Storage
pdf_drive_url         TEXT                 -- link Google Drive (legacy)
wiadomosc_dla_kierowcy TEXT
is_amazon             BOOLEAN DEFAULT false
adr                   BOOLEAN DEFAULT false
lift                  BOOLEAN DEFAULT false
palety_wymiana        BOOLEAN DEFAULT false
palety_ilosc          INTEGER
palety_gdzie          TEXT
wylot_granica         BOOLEAN DEFAULT false
wylot_przejscie       TEXT
powrot_granica        BOOLEAN DEFAULT false
powrot_przejscie      TEXT
ladunek_typ           TEXT
ladunek_waga          TEXT
ladunek_wymiary       TEXT
numery_referencyjne   TEXT
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
```

### Tabela: `zaladunki`
```sql
id              UUID PK
zlecenie_id     UUID FK -> zlecenia
kolejnosc       INTEGER DEFAULT 1
nazwa_firmy     TEXT
ulica           TEXT
kod             TEXT          -- kod pocztowy np. '69-100', '49744'
miasto          TEXT
kraj            TEXT DEFAULT 'Niemcy'
data            DATE
okno_od         TIME
okno_do         TIME
ma_okno         BOOLEAN DEFAULT false
nr_ref          TEXT
```

### Tabela: `rozladunki`
```sql
-- identyczna struktura jak zaladunki
id              UUID PK
zlecenie_id     UUID FK -> zlecenia
kolejnosc       INTEGER DEFAULT 1
nazwa_firmy     TEXT
ulica           TEXT
kod             TEXT
miasto          TEXT
kraj            TEXT
data            DATE
okno_od         TIME
okno_do         TIME
ma_okno         BOOLEAN DEFAULT false
nr_ref          TEXT
```

---

## VRID - format identyfikatora

Format: `AI{YYYY}/{MM}/{NNNNN}` (auto-increment per miesiąc)  
Przykłady: `AI2026/04/00001`, `AI2026/04/00234`

Generowany po stronie backendu przy zapisie zlecenia.

---

## API Backend (FastAPI)

### Endpointy

| Method | Path | Opis |
|--------|------|------|
| POST | `/api/ocr` | Przyjmuje PDF, zwraca JSON z danymi |
| POST | `/api/zlecenia` | Zapisuje zlecenie do Supabase |
| GET | `/api/zlecenia` | Lista zleceń z filtrami |
| GET | `/api/zlecenia/{vrid}` | Szczegóły zlecenia |
| GET | `/api/flota` | Lista pojazdów |
| GET | `/api/kontrahenci` | Lista kontrahentów |
| GET | `/api/export/speda` | Export XLS do SPEDA |

### OCR Flow (POST /api/ocr)

```
1. Przyjmij PDF (multipart/form-data)
2. Zapisz PDF do Supabase Storage
3. Wyślij PDF do Claude AI z promptem ekstrakcji
4. Claude zwraca JSON: {numer_zlecenia, zleceniodawca_nazwa, 
   zleceniodawca_nip, cena_eur, data_zal, data_roz, 
   zaladunki: [{kod, miasto, ulica, godzina}],
   rozladunki: [{kod, miasto, ulica, godzina}],
   towar_opis, waga, wymiary}
5. Sprawdź czy kontrahent istnieje w bazie (po NIP) → jeśli nie, utwórz
6. Zwróć JSON do frontendu (do weryfikacji przez spedytora)
```

### Prompt Claude (OCR)

```
Jesteś ekspertem spedycyjnym. Przeanalizuj wizualnie zlecenie transportowe 
(może być po polsku, niemiecku, angielsku, czesku lub słowacku).

Wyciągnij dane i zwróć WYŁĄCZNIE czysty JSON bez żadnego tekstu:
{
  "numer_zlecenia": "",
  "zleceniodawca_nazwa": "",
  "zleceniodawca_nip": "",
  "cena_eur": 0,
  "towar_opis": "",
  "waga": "",
  "wymiary": "",
  "data_zal": "DD.MM.YYYY",
  "data_roz": "DD.MM.YYYY",
  "zaladunki": [{"kod": "", "miasto": "", "ulica": "", "nazwa_firmy": "", "godzina": ""}],
  "rozladunki": [{"kod": "", "miasto": "", "ulica": "", "nazwa_firmy": "", "godzina": ""}]
}
```

---

## Wiadomość dla kierowcy

Auto-generowana przez Claude lub przez formularz (useEffect w React).

Format:
```
Kontrahent: {nazwa}
Ref: {nr_ref}

ZAŁADUNEK
Data: {data}
Godzina: {od} - {do}
Adres: {ulica}
Kod: {kod}, {kraj}

ROZŁADUNEK
Data: {data}
Godzina: {od} - {do}
Adres: {ulica}
Kod: {kod}, {kraj}

Ładunek: {typ}, {waga}
Wymiary: {wymiary}
KM: {km}
```

---

## Eksport SPEDA (XLS)

Kolumny w Google Sheets "SPEDZIK" (replicated w bazie):
```
zleceniodawca_nazwa | zleceniodawca_nip | zleceniodawca_kod_pocztowy
cena_eur | zaladunek_kod | zaladunek_miasto | zaladunek_ulica
rozladunek_kod | rozladunek_miasto | rozladunek_ulica
numer_zlecenia | webviewlink | sped/stol
LEO | KM | data_roz | data_zal | wiadomosc_dla_kierowcy
```

---

## Flota - dane pojazdu

200 pojazdów. Format danych:
- `typ` - typ auta (Plandeka 13.6m, Chłodnia, Firanka, itp.)
- `nr_leo` - identyfikator LEO (LEO-001 ... LEO-200+)
- `rejestracja` - nr rejestracyjny ciągnika
- `imie_nazwisko` - kierowca

---

## Stara automatyzacja n8n (do zastąpienia)

**Plik:** `n8n/leoleo2 (1).json`

Flow n8n:
1. Webhook POST (PDF + leo, firma, spedytor, km)
2. → Google Drive upload (folder ZLECENIA)
3. → Gemini 2.5 Flash (analiza PDF → JSON)
4. → Azure GPT-4o (generuje wiadomość kierowcy)
5. → Google Sheets "SPEDZIK" (append row)

**Zastępujemy przez:** FastAPI + Claude + Supabase

---

## Kolejność budowania

1. **Supabase** - migracje SQL, wszystkie tabele
2. **Backend OCR** - FastAPI endpoint + Claude AI prompt
3. **Integracja frontendu** - podłączenie formularza do backendu
4. **Historia zleceń** - real data zamiast mockData
5. **Flota** - import 200 pojazdów + CRUD
6. **Eksport SPEDA** - XLS generator
7. **Kontrahenci** - baza + auto-uzupełnianie w formularzu

---

## Zmienne środowiskowe

```env
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_ANON_KEY=
GOOGLE_DRIVE_FOLDER_ID=1LZurM2TMHoIJrio50YJMGaCH4CxbrHnX
```

---

## Kolory brandingu

- Navy: `#151d2b`
- Copper: `#c36945`
- Font: Inter (500/600/700/800)
