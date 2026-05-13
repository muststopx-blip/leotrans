-- SpedTrans output table — dokładne kolumny z formatu XLS SpedTrans
-- Kolumny A,C,D,E,F,G,I,K,N,Q,T,U,W,Y,AD,AF,AI,AL,AM,AN,AO,AP,AQ,AR,AS,AT,AU,AV,AW,AX,AY,AZ,BD,BF,BG,BH,BI,BM,BN,BO,BS,BU,BV,BW,BX,CD

CREATE TABLE IF NOT EXISTS public.spedtrans_output (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zlecenie_id     UUID UNIQUE REFERENCES public.zlecenia(id) ON DELETE CASCADE,

    -- A: Spedytor
    "Spedytor"          TEXT,
    -- C: Nazwa towaru
    "Nazwa towaru"      TEXT,
    -- D: Rodzaj opakowania
    "Rodzaj opakowania" TEXT,
    -- E: ADR
    "ADR"               TEXT,
    -- F: Uwagi
    "Uwagi"             TEXT,
    -- G: Rodzaj zlecenia
    "ZL_RODZ"           TEXT,
    -- I: Data zlecenia YYYYMMDD
    "DATA"              TEXT,
    -- K: Numer zamówienia/zlecenia od klienta
    "NR_ZAM_ZL"         TEXT,
    -- N: Skrót zleceniodawcy (max 30 znaków)
    "SKROT_ZL"          TEXT,
    -- Q: Skrót płatnika
    "SKROT_PL"          TEXT,
    -- T: Skrót przewoźnika (nasza firma)
    "SKROT_P"           TEXT,
    -- U: Symbol typ samochodu
    "SYMBOL_TYP_SAM"    TEXT,
    -- W: Nr rejestracyjny samochodu
    "NR_REJ_SAM"        TEXT,
    -- Y: Nr rejestracyjny naczepy
    "NR_REJ_NAC"        TEXT,
    -- AD: Nazwisko i imię kierowcy 1
    "NAZW_IMIE_KIER1"   TEXT,
    -- AF: Nazwisko i imię kierowcy 2
    "NAZW_IMIE_KIER2"   TEXT,
    -- AI: Nazwa usługi
    "NAZWA_USL"         TEXT,
    -- AL: DK
    "DK"                TEXT,
    -- AM: Waluta zakupu
    "P_WALUTA"          TEXT,
    -- AN: Cena netto zakupu
    "CNETTO_ZAK"        TEXT,
    -- AO: VAT zakupu
    "VAT_ZAK"           TEXT,
    -- AP: Ilość zakupu
    "ILOSC_ZAK"         TEXT,
    -- AQ: JM zakupu
    "JM_ZAK"            TEXT,
    -- AR: FV
    "FV"                TEXT,
    -- AS: Waluta sprzedaży
    "PL_WALUTA"         TEXT,
    -- AT: Cena netto sprzedaży
    "CNETTO"            TEXT,
    -- AU: VAT sprzedaży
    "VAT"               TEXT,
    -- AV: Ilość sprzedaży
    "ILOSC"             TEXT,
    -- AW: JM sprzedaży
    "JM"                TEXT,
    -- AX: Data załadunku YYYYMMDD
    "DATA_ZAL"          TEXT,
    -- AY: Godzina od załadunku HH:MM
    "GODZ_ZAL"          TEXT,
    -- AZ: Godzina do załadunku HH:MM
    "GODZ_DO_ZAL"       TEXT,
    -- BD: Nazwa firmy załadunek
    "NAZWA_ZAL"         TEXT,
    -- BF: Kod kraju załadunku (2 litery: DE, PL, CZ...)
    "KOD_KRAJ_ZAL"      TEXT,
    -- BG: Kod pocztowy załadunku
    "KOD_ZAL"           TEXT,
    -- BH: Miasto załadunku
    "MIASTO_ZAL"        TEXT,
    -- BI: Ulica załadunku
    "ULICA_ZAL"         TEXT,
    -- BM: Data rozładunku YYYYMMDD
    "DATA_ROZ"          TEXT,
    -- BN: Godzina od rozładunku HH:MM
    "GODZ_ROZ"          TEXT,
    -- BO: Godzina do rozładunku HH:MM
    "GODZ_DO_ROZ"       TEXT,
    -- BS: Nazwa firmy rozładunek
    "NAZWA_ROZ"         TEXT,
    -- BU: Kod kraju rozładunku
    "KOD_KRAJ_ROZ"      TEXT,
    -- BV: Kod pocztowy rozładunku
    "KOD_ROZ"           TEXT,
    -- BW: Miasto rozładunku
    "MIASTO_ROZ"        TEXT,
    -- BX: Ulica rozładunku
    "ULICA_ROZ"         TEXT,
    -- CD: Waga brutto towaru (kg, liczba jako text)
    "WBRUTTO_TOW"       TEXT,

    exported_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spedtrans_output ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read" ON public.spedtrans_output
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_write" ON public.spedtrans_output
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_spedtrans_output_zlecenie ON public.spedtrans_output(zlecenie_id);
