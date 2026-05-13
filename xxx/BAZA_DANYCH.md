# BAZA DANYCH — Supabase PostgreSQL

**Projekt:** zfpqoslxvzblzqkhrqyg  
**URL:** https://zfpqoslxvzblzqkhrqyg.supabase.co  
**Dashboard:** https://supabase.com/dashboard/project/zfpqoslxvzblzqkhrqyg

---

## Tabele

### `profile`
Profile użytkowników (automatycznie tworzone po rejestracji w Supabase Auth)

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | = auth.users.id |
| imie_nazwisko | TEXT | |
| inicjaly | TEXT | np. "MK", "AW" |
| rola | TEXT | 'admin' lub 'spedytor' |
| stol_id | UUID FK → stoly | null jeśli solo |

### `stoly`
Grupy robocze spedytorów

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| nazwa | TEXT | np. "Stół 1" |
| skrot | TEXT | np. "S1", "EXP" |

### `kontrahenci`
Baza zleceniodawców (firm zamawiających transport)

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| nazwa | TEXT | pełna nazwa firmy |
| nip | TEXT UNIQUE | format: DE813038265, PL9161394799 |
| adres_ulica | TEXT | |
| adres_kod | TEXT | kod pocztowy siedziby |
| adres_miasto | TEXT | |
| kraj | TEXT | 'PL', 'DE', 'CZ' itd. |
| email | TEXT | |
| telefon | TEXT | |
| uwagi | TEXT | |

**Uwaga:** wiele rekordów ma NULL w adres_kod i nip — dane historyczne wgrane bez kodu pocztowego. Nowe zlecenia już zapisują pełne dane.

### `zlecenia`
Główna tabela zleceń

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| vrid | TEXT UNIQUE | AI2026/05/00001 |
| numer_zlecenia | TEXT | numer od kontrahenta |
| kontrahent_id | UUID FK → kontrahenci | |
| spedytor | TEXT | inicjały lub skrót stołu |
| nr_leo | TEXT FK → flota(nr_leo) | LEO-123 |
| data_przyjecia | DATE | |
| rodzaj_zlecenia | TEXT | 'GIEŁDA' lub 'KONTAKT' |
| rodzaj_spedytora | TEXT | 'solo' lub 'stol' |
| stol_id | UUID FK → stoly | |
| cena_eur | DECIMAL | cena frachtu |
| km | INTEGER | kilometry trasy |
| status | TEXT | 'nowe','w_trasie','zakonczone','anulowane' |
| pdf_url | TEXT | link do Supabase Storage |
| wiadomosc_dla_kierowcy | TEXT | |
| ai_insights | TEXT | wynik analizy AI (plain text) |
| enrichment_status | TEXT | 'pending','processing','done','error' |
| enrichment_error | TEXT | opis błędu |
| spedtrans_row | JSONB | legacy format SpedTrans |
| is_amazon | BOOLEAN | |
| adr, lift, palety_wymiana | BOOLEAN | |
| palety_ilosc | INTEGER | |
| wylot_granica, powrot_granica | BOOLEAN | |
| wylot_przejscie, powrot_przejscie | TEXT | np. 'Świecko' |
| ladunek_typ, ladunek_waga, ladunek_wymiary | TEXT | |
| numery_referencyjne | TEXT | |
| pod_link | TEXT | URL do uploadu POD/CMR |
| created_at, updated_at | TIMESTAMPTZ | |
| created_by | UUID FK → auth.users | |

### `zaladunki` / `rozladunki`
Punkty załadunku/rozładunku (wiele do jednego zlecenia)

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| zlecenie_id | UUID FK → zlecenia | |
| kolejnosc | INTEGER | 1, 2, 3... |
| nazwa_firmy | TEXT | |
| ulica | TEXT | |
| kod | TEXT | kod pocztowy BEZ prefiksu kraju |
| miasto | TEXT | |
| kraj | TEXT | 'Niemcy', 'Polska' itd. |
| data | DATE | |
| okno_od, okno_do | TIME | |
| ma_okno | BOOLEAN | czy jest okno czasowe |
| nr_ref | TEXT | numer referencyjny przy załadunku |
| kontakt_imie | TEXT | |
| kontakt_telefon | TEXT | |
| dodatkowe_info | TEXT | awizacja, instrukcje itd. |

### `flota`
Pojazdy

| Kolumna | Typ | Opis |
|---------|-----|------|
| nr_leo | TEXT PK | LEO-001, LEO-123 itd. |
| typ | TEXT | 'Plandeka 13.6m', 'Chłodnia', 'Firanka' |
| marka | TEXT | 'Scania R450', 'Volvo FH16' |
| rejestracja | TEXT | nr rejestracyjny ciągnika |
| rejestracja_naczepa | TEXT | |
| status | TEXT | 'available','busy','service' |

**Uwaga:** `nr_leo` to TEXT, nie UUID — PostgREST nie obsługuje relacyjnych joinów przez TEXT PK automatycznie. W edge functions flota jest pobierana osobnym zapytaniem (nie przez relacyjny join).

### `kierowcy`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| imie_nazwisko | TEXT | |
| telefon | TEXT | |
| nr_leo | TEXT FK → flota | |
| aktywny | BOOLEAN | |

### `otp_codes`
Kody OTP do 2FA

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| user_id | UUID FK → auth.users | |
| code_hash | TEXT | SHA-256 kodu |
| expires_at | TIMESTAMPTZ | ważny 5 minut |
| used | BOOLEAN | |

### `spedtrans_output`
81 kolumn SpedTrans, wypełnianych przez enrich-zlecenie w tle

Kluczowe kolumny: ID_OBCE (=VRID), ZL_RODZ, SKROT_ZL, SKROT_PL, SKROT_P, DATA_ZAL/ROZ, NAZW_IMIE_KIER1, CNETTO, itd.  
Pełne mapowanie: patrz `PROGRAMY_FIRMOWE.md` lub plik memory.

---

## Widoki

### `zlecenia_full`
JOIN: zlecenia + kontrahenci + flota + profile + stoly + pierwsze załadunek + ostatni rozładunek

Dodatkowe kolumny obliczane:
- `zal_kody_trasa` — ISO_kraju + czysty_kod np. DE89597
- `roz_kody_trasa` — j.w. dla ostatniego rozładunku
- `data_roz_ostatni` — data ostatniego rozładunku (multi-stop)

---

## Funkcje SQL

- `kraj_to_iso(kraj TEXT)` → 2-literowy ISO ('Niemcy' → 'DE')
- `clean_postal_code(kod TEXT, iso TEXT)` → usuwa prefix kraju z kodu ('DE89597' → '89597')

---

## Migracje (`supabase/migrations/`)

| Plik | Co robi |
|------|---------|
| 001_init.sql | Tabele bazowe + widok + RLS |
| 002_users_amazon_enrichment.sql | profile, amazon_zlecenia, spedtrans_export |
| 003_stoly_auth.sql / 003_otp_codes.sql | Stoły, OTP codes, aktualizacja RLS |
| **004_auth_select_policies.sql** | **KRYTYCZNA** — SELECT dla authenticated na załadunki/rozładunki/kontrahenci/flota |
| 005_divaline_feedback.sql | feedback Divaline |
| 006_pod_link_contacts.sql | pod_link + kontakty w załadunkach/rozładunkach |
| 007_import_kontrahenci.sql | Import bazy kontrahentów |
| 006_missing_columns.sql | Brakujące kolumny (enrichment_status, ai_insights itd.) |
| 008_dodatkowe_info.sql | Kolumna dodatkowe_info w załadunkach/rozładunkach |
| 009_spedtrans_output.sql | Tabela spedtrans_output (45 kolumn — v1) |
| 010_view_kody_trasa.sql | Widok zlecenia_full z kody_trasa + funkcje kraj_to_iso |
| 011_spedtrans_output_v2.sql | Dodaje brakujące kolumny do spedtrans_output (v2, 81 kolumn) |
| 20260511_flota_import.sql | Import danych floty (~200 pojazdów) |

---

## RLS (Row Level Security)

Wszystkie tabele mają włączone RLS.

- **Admin** widzi wszystko
- **Spedytor** widzi swoje zlecenia (`created_by = auth.uid()`) + zlecenia swojego stołu (`stol_id`)
- **Flota, kontrahenci, załadunki, rozładunki**: SELECT dla authenticated (migracja 004)
- **Edge Functions** używają `service_role` key → omijają RLS
