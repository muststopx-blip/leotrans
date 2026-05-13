# SpedTrans — finalny format importu (48 kolumn)

**Format pliku:** wszystkie komórki TEXT, Windows-1250  
**Data:** yyyyMMdd | **Godzina:** HH:nn | **Liczba:** 0.0 | **Logiczny:** TAK / NIE

---

| # | Kolumna | Typ | Opis (wg SpedTrans) | Wartość domyślna |
|---|---------|-----|---------------------|------------------|
| 1 | **Spedytor** | | | |
| 2 | **Nazwa towaru** | | | |
| 3 | **Rodzaj opakowania** | | | |
| 4 | **ADR** | | | |
| 5 | **Uwagi** | | | |
| 6 | **ZL_RODZ** | Tekst (3) | Rodzaj zlecenia | Jeśli przewoźnik = własna firma → T, w innych przypadkach S |
| 7 | **DATA** | Data | Data wystawienia dokumentu | data wykonania importu |
| 8 | **ID_OBCE** | Tekst (30) | Identyfikator zewnętrzny (np. numer zlecenia od wystawiającego zlecenie) | Niepowtarzalna wartość dla zleceniodawcy |
| 9 | **DATA** | Data | Data wystawienia dokumentu | data wykonania importu |
| 10 | **NR_ZAM_ZL** | Tekst (30) | Pole w SpedTrans odpowiadające nr. Zam. | Wartość z pola ID_OBCE |
| 11 | **SKROT_ZL** | Tekst (30) | Skrót zleceniodawcy | Wg słownika kontrahentów |
| 12 | **SKROT_PL** | Tekst (30) | Skrót płatnika | Domyślny płatnik z kartoteki zleceniodawcy |
| 13 | **SKROT_P** | Tekst (30) | Skrót przewoźnika | Domyślny przewoźnik dla wybranego zleceniodawcy |
| 14 | **SYMBOL_TYP_SAM** | Tekst (10) | Symbol samochodu | Wg słownika typów pojazdów |
| 15 | **NR_REJ_SAM** | Tekst (20) | Nr rejestracyjny samochodu | Wg rejestru pojazdów |
| 16 | **NR_REJ_NAC** | Tekst (20) | Nr rejestracyjny naczepy | Wg rejestru pojazdów |
| 17 | **NAZW_IMIE_KIER1** | Tekst (86) | Nazwisko i imię kierowcy | Domyślny kierowca 1 z kartoteki przewoźnika |
| 18 | **NAZW_IMIE_KIER2** | Tekst (86) | Nazwisko i imię kierowcy 2 | Domyślny kierowca 2 z kartoteki przewoźnika |
| 19 | **NAZWA_USL** | Tekst (100) | Nazwa usługi, która ma pojawić się na zleceniu | Wg słownika towarów i usług |
| 20 | **DK** | Logiczny | TAK / NIE (czy oczekiwany dokument kosztowy) | TAK jeśli przewoźnik inny niż własna firma |
| 21 | **P_WALUTA** | Tekst (3) | Waluta płatności od strony przewoźnika | Wg słownika walut |
| 22 | **CNETTO_ZAK** | Liczba (10,2) | Cena netto zakupu usługi | 0 |
| 23 | **VAT_ZAK** | Tekst (5) | Stawka VAT strony zakupowej, np. „23%" | Wg słownika stawek VAT |
| 24 | **ILOSC_ZAK** | Liczba (10,4) | Ilość usługi zakupowej | 1 |
| 25 | **JM_ZAK** | Tekst (6) | Jednostka usługi zakupowej, np. „szt" | Wg słownika jednostek miar |
| 26 | **FV** | Logiczny | TAK / NIE (czy oczekiwany dokument sprzedażowy) | TAK jeśli płatnik inny niż własna firma |
| 27 | **PL_WALUTA** | Tekst (3) | Waluta płatności | Wg słownika walut |
| 28 | **CNETTO** | Liczba (10,2) | Cena netto sprzedaży usługi | 0 |
| 29 | **VAT** | Tekst (5) | Stawka VAT strony sprzedażowej, np. „23%" | Wg słownika stawek VAT |
| 30 | **ILOSC** | Liczba (10,4) | Ilość usługi sprzedażowej | 1 |
| 31 | **JM** | Tekst (6) | Jednostka usługi sprzedażowej, np. „szt" | Wg słownika jednostek miar |
| 32 | **DATA_ZAL** | Data | Data załadunku | |
| 33 | **GODZ_ZAL** | Godzina | Godzina załadunku – początek zakresu | |
| 34 | **GODZ_DO_ZAL** | Godzina | Godzina załadunku – koniec zakresu | |
| 35 | **NAZWA_ZAL** | Tekst (100) | Nazwa załadunku | Wg słownika kontrahentów |
| 36 | **KOD_KRAJ_ZAL** | Tekst (5) | Kod kraju załadunku | Wg słownika krajów (ISO 3166 alfa-2) |
| 37 | **KOD_ZAL** | Tekst (10) | Kod pocztowy załadunku | |
| 38 | **MIASTO_ZAL** | Tekst (35) | Miasto załadunku | |
| 39 | **ULICA_ZAL** | Tekst (100) | Ulica załadunku | |
| 40 | **DATA_ROZ** | Data | Data rozładunku | |
| 41 | **GODZ_ROZ** | Godzina | Godzina rozładunku – początek zakresu | |
| 42 | **GODZ_DO_ROZ** | Godzina | Godzina rozładunku – koniec zakresu | |
| 43 | **NAZWA_ROZ** | Tekst (100) | Nazwa rozładunku | Wg słownika kontrahentów |
| 44 | **KOD_KRAJ_ROZ** | Tekst (5) | Kod kraju rozładunku | Wg słownika krajów (ISO 3166 alfa-2) |
| 45 | **KOD_ROZ** | Tekst (10) | Kod pocztowy rozładunku | |
| 46 | **MIASTO_ROZ** | Tekst (35) | Miasto rozładunku | |
| 47 | **ULICA_ROZ** | Tekst (100) | Ulica rozładunku | |
| 48 | **WBRUTTO_TOW** | Liczba (10,2) | Waga brutto towaru | 0 |
