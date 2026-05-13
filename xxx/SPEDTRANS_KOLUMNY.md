# SpedTrans — definicje 81 kolumn importu

Plik do wypełnienia przez Macieja. Kolumna "Twój opis" — wpisz jak SpedTrans używa tego pola.
Kolumna "Co wstawiamy" — co nasz system wpisuje automatycznie.

---

| # | Kolumna | Co wstawiamy (AI) | Twój opis / poprawka |
|---|---------|-------------------|----------------------|
| 1 | **Spedytor** | inicjały spedytora lub skrót stołu | |
| 2 | **Nazwa towaru** | rodzaj ładunku, np. "palety drewno" | |
| 3 | **Rodzaj opakowania** | "WYMIANA" jeśli wymiana palet, inaczej puste | |
| 4 | **ADR** | "TAK" jeśli materiały niebezpieczne, inaczej puste | |
| 5 | **Uwagi** | rodzaj zlecenia: GIEŁDA lub KONTAKT | |
| 6 | **ZL_RODZ** | S (spedycja) lub T (transport dla LEO-150..154) | |
| 7 | **ID_OBCE** | nasz VRID, np. AI2026/05/00042 | |
| 8 | **DATA** | data przyjęcia zlecenia YYYYMMDD | |
| 9 | **INFO_WEW** | puste | |
| 10 | **NR_ZAM_ZL** | numer zlecenia od kontrahenta | |
| 11 | **ID_ZL** | puste — SpedTrans uzupełnia po imporcie | |
| 12 | **ID_OBCE_ZL** | puste | |
| 13 | **SKROT_ZL** | skrócona nazwa zleceniodawcy (≤30 znaków) z naszej bazy | |
| 14 | **ID_PL** | puste | |
| 15 | **ID_OBCE_PL** | puste | |
| 16 | **SKROT_PL** | skrócona nazwa płatnika = SKROT_ZL | |
| 17 | **ID_P** | puste | |
| 18 | **ID_OBCE_P** | puste | |
| 19 | **SKROT_P** | LEO-TRANS (nasz skrót przewoźnika w SpedTrans) | |
| 20 | **SYMBOL_TYP_SAM** | typ pojazdu z floty, np. "Plandeka 13.6m" | |
| 21 | **ID_SAM** | puste — SpedTrans uzupełnia po nr rej | |
| 22 | **NR_REJ_SAM** | numer rejestracyjny ciągnika | |
| 23 | **ID_NAC** | puste | |
| 24 | **NR_REJ_NAC** | numer rejestracyjny naczepy | |
| 25 | **ID_PRZ** | puste | |
| 26 | **NR_REJ_PRZ** | puste | |
| 27 | **SAM_UWAGI** | puste | |
| 28 | **ID_KIER1** | puste — SpedTrans uzupełnia po nr rej | |
| 29 | **NAZW_IMIE_KIER1** | imię i nazwisko kierowcy | |
| 30 | **ID_KIER2** | puste | |
| 31 | **NAZW_IMIE_KIER2** | puste | |
| 32 | **KIER_UWAGI** | puste | |
| 33 | **ID_USL** | puste | |
| 34 | **NAZWA_USL** | USL. TRANSPORTOWA (zawsze) | |
| 35 | **ID_OBCE_USL** | puste | |
| 36 | **INFO_USL** | puste | |
| 37 | **DK** | TAK (zawsze — dokument kosztowy) | |
| 38 | **P_WALUTA** | EUR (waluta zakupu) | |
| 39 | **CNETTO_ZAK** | puste (nie znamy ceny zakupu) | |
| 40 | **VAT_ZAK** | 23% | |
| 41 | **ILOSC_ZAK** | 1 | |
| 42 | **JM_ZAK** | fracht | |
| 43 | **FV** | TAK (zawsze — usługa musi mieć fakturę) | |
| 44 | **PL_WALUTA** | EUR (waluta sprzedaży) | |
| 45 | **CNETTO** | cena frachtu z zlecenia | |
| 46 | **VAT** | 23% | |
| 47 | **ILOSC** | 1 | |
| 48 | **JM** | fracht | |
| 49 | **DATA_ZAL** | data załadunku YYYYMMDD | |
| 50 | **GODZ_ZAL** | godzina od załadunku HH:mm | |
| 51 | **GODZ_DO_ZAL** | godzina do załadunku HH:mm | |
| 52 | **ID_ZAL** | puste | |
| 53 | **ID_OBCE_ZAL** | puste | |
| 54 | **SKROT_ZAL** | pierwsze 15 znaków nazwy firmy załadunku | |
| 55 | **NAZWA_ZAL** | pełna nazwa firmy załadunku | |
| 56 | **NIP_ZAL** | puste (nie mamy NIP miejsc załadunku) | |
| 57 | **KOD_KRAJ_ZAL** | kod kraju załadunku: DE, PL, CZ... | |
| 58 | **KOD_ZAL** | kod pocztowy załadunku | |
| 59 | **MIASTO_ZAL** | miasto załadunku | |
| 60 | **ULICA_ZAL** | ulica załadunku | |
| 61 | **TELEFON_ZAL** | telefon kontaktu przy załadunku | |
| 62 | **NR_REF_ZAL** | numer referencyjny przy załadunku (PO, CMR ref) | |
| 63 | **UWAGI_ZAL** | dodatkowe info załadunku (awizacja, instrukcje) | |
| 64 | **DATA_ROZ** | data rozładunku YYYYMMDD (ostatni stop) | |
| 65 | **GODZ_ROZ** | godzina od rozładunku HH:mm | |
| 66 | **GODZ_DO_ROZ** | godzina do rozładunku HH:mm | |
| 67 | **ID_ROZ** | puste | |
| 68 | **ID_OBCE_ROZ** | puste | |
| 69 | **SKROT_ROZ** | pierwsze 15 znaków nazwy firmy rozładunku | |
| 70 | **NAZWA_ROZ** | pełna nazwa firmy rozładunku | |
| 71 | **NIP_ROZ** | puste | |
| 72 | **KOD_KRAJ_ROZ** | kod kraju rozładunku: DE, PL, CZ... | |
| 73 | **KOD_ROZ** | kod pocztowy rozładunku | |
| 74 | **MIASTO_ROZ** | miasto rozładunku | |
| 75 | **ULICA_ROZ** | ulica rozładunku | |
| 76 | **TELEFON_ROZ** | telefon kontaktu przy rozładunku | |
| 77 | **NR_REF_ROZ** | numer referencyjny przy rozładunku | |
| 78 | **UWAGI_ROZ** | dodatkowe info rozładunku | |
| 79 | **TYP_LAD** | puste (typ załadunku) | |
| 80 | **INFO_TOW** | ładunek: typ + waga + wymiary razem | |
| 81 | **WBRUTTO_TOW** | waga towaru tylko liczba w kg, np. 2880 | |

---

## Przykład wypełnionego wiersza (AI2026/05/00042 — Schenker → TESA)

```
Spedytor:        (puste — brak spedytora w tym zleceniu)
Nazwa towaru:    Sheet Plastic Wrapping
Rodzaj opak.:    (puste)
ADR:             (puste)
Uwagi:           GIEŁDA
ZL_RODZ:         S
ID_OBCE:         AI2026/05/00042
DATA:            20260511
NR_ZAM_ZL:      DEAPW016454S81
SKROT_ZL/PL:    SCHENKER DEUTSCHLAND AG
SKROT_P:         LEO-TRANS
NR_REJ_SAM:     (puste — brak rejestracji dla LEO-123)
DK:              TAK
P_WALUTA:        EUR
CNETTO_ZAK:     (puste)
VAT_ZAK:         23%
ILOSC_ZAK:       1
JM_ZAK:          fracht
FV:              TAK
PL_WALUTA:       EUR
CNETTO:          850
VAT:             23%
ILOSC:           1
JM:              fracht
DATA_ZAL:        20260605
GODZ_ZAL:        09:00
GODZ_DO_ZAL:    14:00
SKROT_ZAL:      TESA-WERK-HAMBU
NAZWA_ZAL:      TESA-WERK-HAMBURG GmbH
KOD_KRAJ_ZAL:   DE
KOD_ZAL:         21147
MIASTO_ZAL:     HAMBURG-HAUSBRUCH
ULICA_ZAL:      MEYENKAMP 10
NR_REF_ZAL:     82953056-3066,FTA0106478
DATA_ROZ:        20260507
GODZ_ROZ:        07:00
GODZ_DO_ROZ:    13:00
SKROT_ROZ:      TESA-WERK OFFEN
NAZWA_ROZ:      TESA-WERK OFFENBURG
KOD_KRAJ_ROZ:   DE
KOD_ROZ:         77652
MIASTO_ROZ:     OFFENBURG
ULICA_ROZ:      MERZSTRASSE 5
INFO_TOW:        Sheet Plastic Wrapping / 2880 kg / 9 Jumbo+9 Gibo Stapelbar / LDM: 5.30
WBRUTTO_TOW:    2880
```

---

## Pytania do Macieja — co trzeba doprecyzować

- [ ] **SKROT_ZL** — czy SpedTrans wymaga dokładnie takiego samego skrótu jak jest w jego bazie kontrahentów? Jeśli tak — które pole w SpedTrans to jest i jak wyszukać?
- [ ] **SKROT_ZAL / SKROT_ROZ** — czy to są kody z bazy adresów SpedTrans, czy może być dowolny tekst?
- [ ] **ZL_RODZ = T** — czy na pewno tylko LEO-150..154 to transport? Które konkretnie auta?
- [ ] **CNETTO_ZAK** — czy wpisywać cene zakupu (od przewoźnika)? Jeśli tak, skąd ją brać?
- [ ] **NIP_ZAL / NIP_ROZ** — czy SpedTrans wymaga NIP miejsc załadunku/rozładunku?
- [ ] **TYP_LAD** — co tu wpisywać? Np. "boczny", "tylny", "zintegrowany"?
- [ ] **INFO_WEW** — co to pole robi w SpedTrans? Zostawiamy puste?
