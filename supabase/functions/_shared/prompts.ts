// Prompty Claude AI używane w edge functions

export const PROMPT_OCR_FAST = `Jesteś ekspertem spedycyjnym. Przeanalizuj wizualnie załączone zlecenie transportowe.
Zlecenie może być w języku: polskim, niemieckim, angielskim, czeskim lub słowackim.

Klucz tłumaczeń:
- Nakládka / Beladestelle / Loading place = Załadunek
- Vykládka / Entladestelle / Unloading place = Rozładunek
- Prepravné / Frachtpreis / Freight = Cena
- Objednávateľ / Auftraggeber / Consignor = Firma zamawiająca
- Ansprechpartner / Kontaktperson / Contact person / Osoba kontaktowa / Kontakt = dane kontaktowe klienta

Zwróć WYŁĄCZNIE czysty JSON (bez markdown, bez komentarzy, bez \`\`\`):
{
  "numer_zlecenia": "numer zlecenia/zamówienia od zamawiającego (Auftragsnummer / Order number / Číslo objednávky / Nr zlecenia) — szukaj w nagłówku lub przy nazwie zamawiającego, NIE mylić z numerem referencyjnym załadunku",
  "zleceniodawca_nazwa": "pełna nazwa firmy zamawiającej",
  "zleceniodawca_nip": "NIP/VAT/USt-ID zleceniodawcy (z prefiksem kraju np. PL, DE, CZ)",
  "zleceniodawca_kraj": "2-literowy kod kraju zamawiającego np. DE, PL, CZ, AT, FR (z adresu lub NIP-u)",
  "zleceniodawca_kod": "kod pocztowy siedziby firmy zamawiającej",
  "zleceniodawca_emaile": ["wszystkie emaile z dokumentu KTÓRYCH DOMENA NIE ZAWIERA 'leo-trans' — to są kontakty kontrahenta"],
  "zleceniodawca_telefon": "numer telefonu firmy zamawiającej (nie klienta przy załadunku)",
  "cena_eur": 0,
  "towar_opis": "rodzaj towaru",
  "waga": "waga z jednostką np. 1200 kg",
  "wymiary": "wymiary lub ilość palet/sztuk np. 11 palet 120x80x100",
  "ldm": "metry ładunkowe jeśli podane",
  "pod_link": "URL do wgrania POD/CMR/dokumentów dostawy jeśli jest w dokumencie (szukaj fraz: 'upload POD', 'hochladen', 'nahrát', 'wgraj dokument', portal URL itp.) — null jeśli brak",
  "zaladunki": [
    {
      "kolejnosc": 1,
      "nazwa_firmy": "nazwa firmy w miejscu załadunku",
      "ulica": "ulica i numer",
      "kod": "kod pocztowy",
      "miasto": "miasto",
      "kraj": "Polska/Niemcy/Czechy/Austria/Francja/Wlochy/Hiszpania/Slowacja/Wegry",
      "data": "DD.MM.YYYY",
      "okno_od": "HH:MM",
      "okno_do": "HH:MM",
      "nr_ref": "numer referencyjny przy tym załadunku (CMR ref, PO number, booking nr itp.) — NIE mylić z numerem zlecenia",
      "kontakt_imie": "imię/nazwisko osoby kontaktowej przy tym załadunku jeśli podane (Ansprechpartner itp.)",
      "kontakt_telefon": "telefon osoby kontaktowej przy tym załadunku jeśli podany",
      "dodatkowe_info": "wszelkie dodatkowe informacje, instrukcje, uwagi dotyczące tego załadunku (np. wymagania wejścia, dokumenty, procedury, języki, godziny przerw, specjalne wymagania) — zbierz WSZYSTKO co nie pasuje do innych pól"
    }
  ],
  "rozladunki": [
    {
      "kolejnosc": 1,
      "nazwa_firmy": "nazwa firmy w miejscu rozładunku",
      "ulica": "ulica i numer",
      "kod": "kod pocztowy",
      "miasto": "miasto",
      "kraj": "Polska/Niemcy/Czechy/Austria/Francja/Wlochy/Hiszpania/Slowacja/Wegry",
      "data": "DD.MM.YYYY",
      "okno_od": "HH:MM",
      "okno_do": "HH:MM",
      "nr_ref": "numer referencyjny przy tym rozładunku — NIE mylić z numerem zlecenia",
      "kontakt_imie": "imię/nazwisko osoby kontaktowej przy tym rozładunku jeśli podane",
      "kontakt_telefon": "telefon osoby kontaktowej przy tym rozładunku jeśli podany",
      "dodatkowe_info": "wszelkie dodatkowe informacje, instrukcje, uwagi dotyczące tego rozładunku"
    }
  ],
  "specjalne": {
    "adr": false,
    "palety_wymiana": false,
    "wymogi_pojazdu": "np. Plandeka 13.6m, Chlodnia, tylko Tautliner z EDSCHA"
  }
}

Jeśli danych nie ma w dokumencie, użyj null dla stringów i 0 dla liczb.
WAŻNE: zleceniodawca_emaile to TABLICA — wypisz WSZYSTKIE emaile z dokumentu których domena nie zawiera 'leo-trans'.
WAŻNE: numer_zlecenia to numer nadany przez ZAMAWIAJĄCEGO (Auftragsnummer, Order No, Nr zlecenia itp.) — znajduje się zwykle w nagłówku zlecenia przy nazwie firmy zamawiającej. Zawsze go wyciągnij — jest na każdym zleceniu.`;


export const PROMPT_DRIVER_MESSAGE = `Na podstawie danych zlecenia spedycyjnego wygeneruj krótką, czytelną wiadomość dla kierowcy ciężarówki.

Użyj dokładnie tego formatu (bez żadnych dodatkowych komentarzy):

Kontrahent: {KONTRAHENT}
Ref: {NR_ZLECENIA}

ZAŁADUNEK{NUMER_JESLI_WIELE}
Data: {DATA}
Godzina: {OD} - {DO}
{NAZWA_FIRMY}
{ULICA}, {KOD} {MIASTO}, {KRAJ}
{NR_REF_JESLI_JEST}

ROZŁADUNEK{NUMER_JESLI_WIELE}
Data: {DATA}
Godzina: {OD} - {DO}
{NAZWA_FIRMY}
{ULICA}, {KOD} {MIASTO}, {KRAJ}
{NR_REF_JESLI_JEST}

Ładunek: {TOWAR}, {WAGA}
Wymiary: {WYMIARY}
KM: {KM}

Zasady:
- Jeśli jest 1 załadunek i 1 rozładunek - nie dodawaj numerów (ZAŁADUNEK zamiast ZAŁADUNEK 1)
- Jeśli brak okna czasowego - pomiń linię Godzina
- Jeśli brak nr ref - pomiń tę linię
- Zwróć TYLKO gotowy tekst, bez żadnych wstępów`;


export const PROMPT_ENRICH_SPEDTRANS = `Na podstawie danych zlecenia przygotuj wiersz do eksportu SpedTrans.
Zwróć TYLKO JSON z polami w dokładnie tym formacie który podano, bez żadnych komentarzy.`;
