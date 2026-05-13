# LEOTRANS — Pełny opis projektu

## 1. Kontekst biznesowy

**Firma:** LEO-TRANS MACIEJ LEW SPÓŁKA KOMANDYTOWA  
**Adres:** ul. Powstańców Wielkopolskich 2A, 56-300 Milicz  
**NIP:** 9161394799  
**Kontakt:** dispo@leo-trans.pl | +48 713 896 700

Firma transportowa z flotą ~200 ciężarówek (oznaczonych LEO-001 do LEO-200+).
Spedytorzy (~28 osób) obsługują zlecenia od kontrahentów — głównie firm z Niemiec, Czech, Austrii, Polski.

### Przed systemem (stara automatyzacja — n8n)

Workflow w n8n (plik `n8n/leoleo2 (1).json`):
1. Webhook POST (PDF + dane ręczne)
2. Google Drive upload (folder ZLECENIA)
3. Gemini 2.5 Flash → analiza PDF → JSON
4. Azure GPT-4o → wiadomość dla kierowcy
5. Google Sheets "SPEDZIK" → append row

**Problemy:** ręczne uzupełnianie, brak walidacji, brak podglądu historii, brak eksportu do SpedTrans.

---

## 2. Cel projektu

Automatyzacja pełnego obiegu zlecenia:

```
PDF od kontrahenta
    ↓
[AI OCR] Gemini 2.5 Flash odczytuje dane (~5s)
    ↓
[Formularz] Spedytor weryfikuje i koryguje dane
    ↓
[Zapis] Baza danych z unikalnym VRID (AI2026/05/00001)
    ↓
[Wiadomość] Gotowy tekst dla kierowcy (kopiuj → WhatsApp)
    ↓
[SpedTrans] Auto-eksport XLS (81 kolumn) do systemu SpedTrans
    ↓
[AI Analiza] Gemini czyta cały dokument → wyciąga drobny druk, kontakty, warunki
```

---

## 3. Architektura systemu

```
Przeglądarka (React 19 + Tailwind)
│
├── [Auth] email + hasło → Supabase Auth
│          └── OTP 2FA → Edge Function: send-otp → email (Resend)
│                         Edge Function: verify-otp → sprawdza SHA-256 hash
│
├── [Upload PDF] → Edge Function: ocr-zlecenie
│                   ├── konwertuje PDF → JPG (strona po stronie)
│                   ├── Gemini 2.5 Flash (bez thinking) → JSON z danymi
│                   └── sprawdza kontrahenta w DB (po NIP)
│
├── [Formularz] ← wypełniony z OCR, edytowalny przez spedytora
│   └── [Zapisz] → Edge Function: save-zlecenie
│                   ├── generuje VRID (AI2026/MM/NNNNN)
│                   ├── zapisuje zlecenie + załadunki + rozładunki
│                   └── fire-and-forget → enrich-zlecenie
│
├── [Tło] enrich-zlecenie (30-120s, niewidoczne dla spedytora)
│          ├── Gemini 2.5 Flash (max thinking) → AI insights z dokumentu
│          ├── Claude Haiku 4.5 → wiadomość dla kierowcy (jeśli brak)
│          └── zapisuje do: zlecenia.ai_insights + spedtrans_output
│
├── [Historia] tabela zleceń z filtrami, sortowaniem, podglądem
│   └── OrderDetail: zakładki Zlecenie / Wiadomość / PDF / AI Analiza
│
└── [Flota] podgląd pojazdów LEO-001..200+
```

---

## 4. Identyfikator VRID

Format: `AI{YYYY}/{MM}/{NNNNN}` — auto-increment per miesiąc  
Przykłady: `AI2026/05/00001`, `AI2026/05/00234`

Generowany przez PostgreSQL trigger przy zapisie zlecenia.

---

## 5. System 4 podmiotów w dokumencie transportowym

Kluczowe dla OCR — na jednym zleceniu są ZAWSZE 4 różne podmioty:

| # | Rola | Gdzie w dok. | Co robimy |
|---|------|--------------|-----------|
| 1 | **ZLECENIODAWCA** | Nagłówek, logo, NIP | → wpisujemy do formularza jako kontrahent |
| 2 | **PRZEWOŹNIK** | Sekcja "Dopravca/Frachtführer/Carrier" | = LEO-TRANS → **ignorujemy całkowicie** |
| 3 | **ZAŁADUNEK** | Sekcja "Nakládka/Beladestelle/Loading" | → zaladunki[] |
| 4 | **ROZŁADUNEK** | Sekcja "Vykládka/Entladestelle/Unloading" | → rozladunki[] |

**Błąd który się zdarzał:** OCR mylił Leo-Trans (przewoźnika) z kontrahentem.
Rozwiązanie: prompt z regułą "PRZEWOŹNIK = LEO-TRANS = IGNORUJ CAŁKOWICIE".

---

## 6. System stołów (grupy robocze)

Spedytorzy mogą pracować solo lub w "stole" (grupy ~3 osób).

- Tabela `stoly` (id, nazwa, skrot)
- `profile.stol_id` — przypisanie spedytora do stołu
- W formularzu: toggle SOLO/STÓŁ → różny podpis w zleceniu i SpedTrans
- `rodzaj_spedytora` = 'solo' lub 'stol' w tabeli `zlecenia`

---

## 7. SpedTrans — eksport

SpedTrans to program TMS (Transport Management System) używany w firmie.
Import zleceń przez plik XLS, 81 kolumn. Eksport auto-generowany po zapisaniu zlecenia.

Kluczowe kolumny:
- `ID_OBCE` = nasz VRID (AI2026/05/00001)
- `ZL_RODZ` = "S" (spedycja) lub "T" (transport — tylko LEO-150..154)
- `SKROT_ZL/PL` = skrócona nazwa kontrahenta (z bazy kontrahentów)
- `NR_REJ_SAM/NAC` = rejestracja ciągnika/naczepy
- `DATA_ZAL/ROZ`, `GODZ_ZAL/ROZ` = daty i godziny załadunku/rozładunku

Pliki: `aplikacja/leo.app/src/spedaExport.js` (client-side XLS)  
Tabela DB: `spedtrans_output` (81 kolumn, wypełniana przez enrich-zlecenie w tle)

---

## 8. AI Analiza (enrich-zlecenie)

Po zapisaniu zlecenia, w tle (fire-and-forget) Gemini 2.5 Flash z max thinking:
1. Pobiera PDF ze Storage i konwertuje na JPG
2. Wizualnie analizuje CAŁY dokument (nie tylko tekst)
3. Wyciąga informacje których **spedytor NIE zobaczy w formularzu**:

```
KONTAKTY
— telefony i emaile z dokumentu

WARUNKI PŁATNOŚCI
— termin, dokumenty do faktury, kary

WYMAGANIA OPERACYJNE
— awizacja, procedury wejścia, ograniczenia godzinowe

WYMAGANIA POJAZDU
— certyfikaty, wyposażenie niestandardowe

DROBNY DRUK
— kary umowne, limit odpowiedzialności, ubezpieczenie OC

ALERTY
— wszystko pilne lub ryzykowne
```

Wynik zapisywany do `zlecenia.ai_insights` i widoczny w zakładce "AI Analiza" w OrderDetail.

---

## 9. Flota

~200 pojazdów oznaczonych LEO-001 do LEO-200+.
- LEO-001..149: zlecenia spedycji (ZL_RODZ = S)
- LEO-150..154: zlecenia transportu (ZL_RODZ = T)

Tabela `flota`: nr_leo, typ, marka, rejestracja, rejestracja_naczepa, status  
Tabela `kierowcy`: imie_nazwisko, telefon, nr_leo (FK)

---

## 10. Kolory i branding

- Navy: `#151d2b`
- Copper: `#c36945`
- Font: Inter (500/600/700/800)
