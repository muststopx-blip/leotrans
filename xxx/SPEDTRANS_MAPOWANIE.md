# SpedTrans — mapowanie pól (jak system wypełnia każdą kolumnę)

Plik opisuje co nasz system wstawia w każdą z 48 kolumn przy eksporcie do SpedTrans.  
Źródło danych: tabele `zlecenia`, `zaladunki`, `rozladunki`, `kontrahenci`, `flota`, `kierowcy`.

**Uwaga techniczna:** format godziny w SpedTrans to `HH:nn` (nie `HH:mm`).

---

| # | Kolumna | Co wstawiamy | Źródło w DB |
|---|---------|--------------|-------------|
| 1 | **Spedytor** | inicjały spedytora lub skrót stołu | `zlecenia.spedytor` |
| 2 | **Nazwa towaru** | opis ładunku | `zlecenia.ladunek_typ` |
| 3 | **Rodzaj opakowania** | `WYMIANA` jeśli wymiana palet, inaczej puste | `zlecenia.palety_wymiana` |
| 4 | **ADR** | `TAK` jeśli materiały niebezpieczne, inaczej puste | `zlecenia.adr` |
| 5 | **Uwagi** | rodzaj zlecenia | `zlecenia.rodzaj_zlecenia` → `GIEŁDA` lub `KONTAKT` |
| 6 | **ZL_RODZ** | `T` dla LEO-150..154 (własny transport), `S` dla pozostałych (spedycja) | `zlecenia.nr_leo` — sprawdzamy numer |
| 7 | **DATA** | data przyjęcia zlecenia | `zlecenia.data_przyjecia` → `yyyyMMdd` |
| 8 | **ID_OBCE** | nasz unikalny identyfikator zlecenia | `zlecenia.vrid` → np. `AI2026/05/00042` |
| 9 | **DATA** | jak wyżej (pole powtórzone w formacie SpedTrans) | `zlecenia.data_przyjecia` → `yyyyMMdd` |
| 10 | **NR_ZAM_ZL** | numer zlecenia od kontrahenta | `zlecenia.numer_zlecenia` |
| 11 | **SKROT_ZL** | skrót nazwy zleceniodawcy (≤30 znaków) z bazy SpedTrans | `kontrahenci.nazwa` — lookup po `kontrahent_id`, fallback ILIKE |
| 12 | **SKROT_PL** | skrót płatnika = zawsze taki sam jak SKROT_ZL | identycznie jak kolumna 11 |
| 13 | **SKROT_P** | zawsze `LEO-TRANS` (nasz skrót przewoźnika w słowniku SpedTrans) | stała wartość |
| 14 | **SYMBOL_TYP_SAM** | typ pojazdu ze słownika SpedTrans | `flota.typ` → np. `Plandeka 13.6m` |
| 15 | **NR_REJ_SAM** | numer rejestracyjny ciągnika | `flota.rejestracja` |
| 16 | **NR_REJ_NAC** | numer rejestracyjny naczepy | `flota.rejestracja_naczepa` |
| 17 | **NAZW_IMIE_KIER1** | imię i nazwisko kierowcy | `kierowcy.imie_nazwisko` (przypisany do pojazdu) |
| 18 | **NAZW_IMIE_KIER2** | puste (brak drugiego kierowcy) | — |
| 19 | **NAZWA_USL** | zawsze `USŁ. TRANSPORTOWA` | stała wartość |
| 20 | **DK** | zawsze `TAK` (dokument kosztowy wymagany) | stała wartość |
| 21 | **P_WALUTA** | zawsze `EUR` | stała wartość |
| 22 | **CNETTO_ZAK** | puste (nie znamy ceny zakupu od przewoźnika) | — |
| 23 | **VAT_ZAK** | `23%` | stała wartość |
| 24 | **ILOSC_ZAK** | `1` | stała wartość |
| 25 | **JM_ZAK** | `fracht` | stała wartość |
| 26 | **FV** | zawsze `TAK` (faktura sprzedażowa wymagana) | stała wartość |
| 27 | **PL_WALUTA** | zawsze `EUR` | stała wartość |
| 28 | **CNETTO** | cena frachtu z zlecenia | `zlecenia.cena_eur` |
| 29 | **VAT** | `23%` | stała wartość |
| 30 | **ILOSC** | `1` | stała wartość |
| 31 | **JM** | `fracht` | stała wartość |
| 32 | **DATA_ZAL** | data załadunku (pierwszy punkt) | `zaladunki[kolejnosc=1].data` → `yyyyMMdd` |
| 33 | **GODZ_ZAL** | godzina od załadunku | `zaladunki[0].okno_od` → `HH:nn` (jeśli `ma_okno = true`) |
| 34 | **GODZ_DO_ZAL** | godzina do załadunku | `zaladunki[0].okno_do` → `HH:nn` |
| 35 | **NAZWA_ZAL** | pełna nazwa firmy załadunku | `zaladunki[0].nazwa_firmy` |
| 36 | **KOD_KRAJ_ZAL** | kod kraju ISO 3166 | `zaladunki[0].kraj` → funkcja `kraj_to_iso()` → np. `DE`, `PL` |
| 37 | **KOD_ZAL** | kod pocztowy bez prefiksu kraju | `zaladunki[0].kod` → funkcja `clean_postal_code()` |
| 38 | **MIASTO_ZAL** | miasto załadunku | `zaladunki[0].miasto` |
| 39 | **ULICA_ZAL** | ulica załadunku | `zaladunki[0].ulica` |
| 40 | **DATA_ROZ** | data rozładunku (ostatni punkt) | `rozladunki[max(kolejnosc)].data` → `yyyyMMdd` |
| 41 | **GODZ_ROZ** | godzina od rozładunku | `rozladunki[last].okno_od` → `HH:nn` |
| 42 | **GODZ_DO_ROZ** | godzina do rozładunku | `rozladunki[last].okno_do` → `HH:nn` |
| 43 | **NAZWA_ROZ** | pełna nazwa firmy rozładunku | `rozladunki[last].nazwa_firmy` |
| 44 | **KOD_KRAJ_ROZ** | kod kraju ISO 3166 | `rozladunki[last].kraj` → `kraj_to_iso()` → np. `DE`, `PL` |
| 45 | **KOD_ROZ** | kod pocztowy bez prefiksu kraju | `rozladunki[last].kod` → `clean_postal_code()` |
| 46 | **MIASTO_ROZ** | miasto rozładunku | `rozladunki[last].miasto` |
| 47 | **ULICA_ROZ** | ulica rozładunku | `rozladunki[last].ulica` |
| 48 | **WBRUTTO_TOW** | waga towaru — tylko liczba w kg | `zlecenia.ladunek_waga` → wyciągamy samą liczbę, np. `2880 kg` → `2880` |

---

## Logika ZL_RODZ (kol. 6)

```
nr_leo = "LEO-150" ... "LEO-154"  →  ZL_RODZ = "T"  (własny transport Leo-Trans)
nr_leo = cokolwiek innego          →  ZL_RODZ = "S"  (spedycja, zewnętrzny przewoźnik)
brak pojazdu                       →  ZL_RODZ = "S"
```

## Logika SKROT_ZL (kol. 11 i 12)

SpedTrans dopasowuje kontrahenta po skrócie ze swojego słownika. Musimy podać dokładnie tę samą wartość.

```
1. Jeśli zlecenie ma kontrahent_id → kontrahenci.nazwa (obcięta do 30 znaków)
2. Fallback: szukaj w kontrahenci ILIKE '%<nazwa_z_OCR>%'
            + opcjonalnie dopasuj adres_kod
3. Ostateczny fallback: nazwa z OCR obcięta do 30 znaków
```

## Multi-stop

Jeden wiersz SpedTrans = jedno zlecenie.  
- Załadunek: `zaladunki` z `kolejnosc = 1` (pierwszy)  
- Rozładunek: `rozladunki` z `max(kolejnosc)` (ostatni)  
- Pośrednie punkty (kolejnosc > 1) nie są eksportowane do SpedTrans (brak kolumn)

## Gdzie to jest w kodzie

| Plik | Co robi |
|------|---------|
| `aplikacja/leo.app/src/spedaExport.js` | Generator XLS (SheetJS) — eksport po zapisaniu zlecenia |
| `supabase/functions/enrich-zlecenie/index.ts` | Wypełnia `spedtrans_output` w tle (po ok. 30–90s) |
| `supabase/migrations/011_spedtrans_output_v2.sql` | Definicja tabeli `spedtrans_output` w DB |
