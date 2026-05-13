# STATUS PROJEKTU — Co zrobione / Co do zrobienia

*Ostatnia aktualizacja: maj 2026*

---

## ZROBIONE ✅

### Auth i użytkownicy
- [x] Logowanie email + hasło (Supabase Auth)
- [x] 2FA — kod OTP wysyłany emailem (Resend) lub w logach (tryb dev)
- [x] Sesja JWT w localStorage z weryfikacją `exp`
- [x] Reset hasła przez email (Supabase built-in)
- [x] Profile użytkowników (imię, inicjały, rola, stół)
- [x] System stołów (grupy robocze)

### Upload i OCR
- [x] Upload PDF zlecenia → Edge Function ocr-zlecenie
- [x] Konwersja PDF → JPG (strona po stronie, max 4 strony)
- [x] Gemini 2.5 Flash — czyta PDF wizualnie (nie OCR tekstu!)
- [x] Rozróżnienie 4 podmiotów w dokumencie (zleceniodawca / Leo-Trans / załadunek / rozładunek)
- [x] Rozpoznawanie dokumentów PL/DE/CZ/SK/AT/FR
- [x] PDF zapisywany do Supabase Storage (bucket: pdfs)
- [x] Sprawdzanie kontrahenta w DB po NIP

### Formularz zlecenia
- [x] Wypełnianie z OCR (edytowalne pola)
- [x] Wielokrotne załadunki i rozładunki
- [x] Okna czasowe (ma_okno toggle)
- [x] Kontakt przy załadunku/rozładunku
- [x] Dodatkowe info (awizacja, instrukcje)
- [x] Wiadomość dla kierowcy — generowana na bieżąco
- [x] Checkboxy: ADR, LIFT, PALETY WYMIANA, WYLOT/POWRÓT GRANICA
- [x] Auto-fill spedytora z profilu
- [x] Toggle SOLO/STÓŁ

### Zapis i baza danych
- [x] Edge Function save-zlecenie
- [x] VRID auto-generowany (AI2026/MM/NNNNN)
- [x] Zlecenie + załadunki + rozładunki w DB
- [x] Automatyczne tworzenie kontrahenta jeśli nie istnieje w DB
- [x] Walidacja FK flota (auto-upsert)
- [x] Fire-and-forget do enrich-zlecenie

### Tło (enrich-zlecenie)
- [x] Gemini 2.5 Flash z max thinking (24576 tokenów)
- [x] AI Insights — drobny druk, kontakty, warunki
- [x] Wiadomość dla kierowcy (Claude Haiku 4.5) jeśli brak
- [x] Zapis do spedtrans_output (81 kolumn SpedTrans)
- [x] Spinner "ładowanie" w historii podczas enrichmentu
- [x] enrichment_status: pending → processing → done / error

### Historia zleceń
- [x] Tabela z filtrami daty, search, sortowanie
- [x] OrderDetail — slide-in panel
  - [x] Zakładka Zlecenie (wszystkie dane, załadunki/rozładunki jako karty)
  - [x] Zakładka Wiadomość (terminal-style + kopiuj)
  - [x] Zakładka PDF (iframe + "Otwórz zewnętrznie")
  - [x] Zakładka AI Analiza (plain text z insightami)
- [x] Mobile responsiveness (hamburger, overflow-x tabela)

### SpedTrans eksport
- [x] Auto-eksport po zapisaniu zlecenia (SheetJS XLS)
- [x] 81 kolumn w poprawnym formacie SpedTrans
- [x] ID_OBCE = VRID, ZL_RODZ = S/T (T dla LEO-150..154)
- [x] SKROT_ZL/PL z bazy kontrahentów (lookup po nazwie + kod pocztowy)
- [x] Tabela spedtrans_output w DB (wypełniana w tle)

### Flota
- [x] Podgląd pojazdów (karty)
- [x] Datalist NR LEO w formularzu zlecenia

### Baza danych / infrastruktura
- [x] Migracje SQL 001-011
- [x] RLS (Row Level Security) na wszystkich tabelach
- [x] Widok zlecenia_full (z kody trasy, data_roz_ostatni)
- [x] Funkcje kraj_to_iso() i clean_postal_code() w DB
- [x] Deploy frontu na FTP home.pl (deploy.ps1)
- [x] Deploy Edge Functions przez Supabase CLI

---

## DO ZROBIENIA ❌

### Priorytet WYSOKI

- [ ] **Migracja 004** — uruchomić raz w Supabase SQL Editor  
  Plik: `supabase/migrations/004_auth_select_policies.sql`  
  *Bez niej załadunki/rozładunki nie są widoczne dla authenticated users → SPEDA auto-export może mieć problemy*

- [ ] **OrderEdit** — formularz edycji istniejącego zlecenia  
  Teraz: `handleEditOrder` pokazuje alert "wkrótce"  
  Potrzeba: załaduj dane zlecenia do formularza, zapisz zmiany (UPDATE)

- [ ] **Baza kontrahentów — sprzątanie**  
  Problem: wiele duplikatów (MCG Logistics ×8, DC Cargo ×4), wszystkie bez NIP i adres_kod  
  Rozwiązanie: migracja SQL deduplikująca + usunięcie "Leo-Trans" z kontrahentów  
  *Ważne dla poprawnego działania SKROT_ZL w SpedTrans*

- [ ] **OCR — bug Leo-Trans jako kontrahent**  
  W niektórych dokumentach OCR wciąż wpisuje Leo-Trans jako zleceniodawcę  
  Rozwiązanie: post-processing w ocr-zlecenie sprawdzający czy `zleceniodawca_nazwa` zawiera "Leo-Trans" → null

### Priorytet ŚREDNI

- [ ] **Flota CRUD** — dodawanie/edycja pojazdów, przypisywanie kierowców, zmiana statusu  
  Teraz: tylko podgląd kart

- [ ] **Kontrahenci** — pełny moduł zarządzania bazą firm  
  Potrzeba: lista, wyszukiwanie, edycja danych, autocomplete w formularzu zlecenia

- [ ] **Produkcja Resend** — zweryfikować domenę leo-trans.pl w Resend  
  Teraz: kody OTP lądują w logach Supabase (dev fallback)  
  Po weryfikacji: email z kodem będzie działał automatycznie

- [ ] **GPS moduł** — integracja z GBox (urządzenia w autach)  
  Plan: pole `gbox_device_id` w tabeli flota + zakładka Mapa z live pozycjami  
  Czeka na: API token z GBox (użytkownik ma sprawdzić w panelu gbox)

### Priorytet NISKI

- [ ] **Amazon import** — parsowanie Google Sheet → tworzenie zleceń Amazon  
  Format arkusza: 12 kolumn (appointment_id, kierowca, status, miasto_zal, fc_zal, kod_zal, dzien, czas_zal, miasto_roz, fc_roz, kod_roz, czas_roz)

- [ ] **Backend Python FastAPI** — `app.py` to placeholder, nie jest aktywny  
  W planach: alternatywny backend na wypadek gdyby Edge Functions miały ograniczenia

- [ ] **Paginacja historii** — teraz limit 200 zleceń, widok wolny bo `zlecenia_full` ma 9 correlated subqueries na wiersz  
  Rozwiązanie: zmniejszyć limit do 50 + "załaduj więcej"

- [ ] **NAZW_IMIE_KIER1 w SpedTrans** — puste gdy brak przypisanego kierowcy  
  Zależy od: Flota CRUD (przypisywanie kierowców do pojazdów)

---

## ZNANE BUGI 🐛

| Bug | Opis | Status |
|-----|------|--------|
| OCR Leo-Trans jako kontrahent | W ~20% dokumentów OCR wpisuje Leo-Trans jako zleceniodawcę | Częściowo — prompt zawiera regułę IGNORUJ, ale niektóre PDFy wciąż fail |
| DATA_ROZ przed DATA_ZAL | Czasem OCR zapisuje daty w złej kolejności | Dane z OCR — do weryfikacji przez spedytora |
| SYMBOL_TYP_SAM pusty | SpedTrans nie dostaje typu pojazdu gdy LEO nie ma w flocie | Wymaga FlotaCRUD |
| Duplikaty kontrahentów | MCG Logistics ×8, DC Cargo ×4 itd. | Wymaga migracji oczyszczającej |
