-- ============================================================
-- LEOTRANS - Migracja 001: Inicjalizacja bazy danych
-- Wklej w: Supabase SQL Editor > New query > Run
-- Projekt: zfpqoslxvzblzqkhrqyg
-- ============================================================

-- --------------------------------------------------------
-- 1. FLOTA (pojazdy)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flota (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nr_leo          TEXT UNIQUE NOT NULL,       -- 'LEO-001', 'LEO-144'
    typ             TEXT NOT NULL,              -- 'Plandeka 13.6m', 'Chłodnia', 'Firanka'
    marka           TEXT,                       -- 'Scania R450', 'Volvo FH16'
    rejestracja     TEXT,                       -- nr rejestracyjny ciągnika
    rejestracja_naczepa TEXT,
    status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'busy', 'service')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 2. KIEROWCY
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kierowcy (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imie_nazwisko   TEXT NOT NULL,
    telefon         TEXT,
    nr_leo          TEXT REFERENCES public.flota(nr_leo) ON UPDATE CASCADE ON DELETE SET NULL,
    aktywny         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 3. KONTRAHENCI (zleceniodawcy)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kontrahenci (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazwa           TEXT NOT NULL,
    nip             TEXT UNIQUE,                -- 'PL9161394799', 'DE335983206'
    adres_ulica     TEXT,
    adres_kod       TEXT,
    adres_miasto    TEXT,
    kraj            TEXT DEFAULT 'PL',
    email           TEXT,
    telefon         TEXT,
    uwagi           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 4. SEKWENCJA VRID (AI2026/04/00001)
-- --------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.vrid_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_vrid()
RETURNS TEXT AS $$
DECLARE
    seq_val BIGINT;
    year_part TEXT;
    month_part TEXT;
BEGIN
    seq_val := nextval('public.vrid_seq');
    year_part := to_char(now(), 'YYYY');
    month_part := to_char(now(), 'MM');
    RETURN 'AI' || year_part || '/' || month_part || '/' || lpad(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- 5. ZLECENIA (główna tabela)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zlecenia (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vrid                    TEXT UNIQUE NOT NULL DEFAULT public.generate_vrid(),
    numer_zlecenia          TEXT,               -- numer od kontrahenta np. 'ZZ-46/ZP/2026/04'
    kontrahent_id           UUID REFERENCES public.kontrahenci(id) ON DELETE SET NULL,
    spedytor                TEXT,               -- inicjały / imię
    nr_leo                  TEXT REFERENCES public.flota(nr_leo) ON UPDATE CASCADE ON DELETE SET NULL,
    data_przyjecia          DATE NOT NULL DEFAULT CURRENT_DATE,
    rodzaj_zlecenia         TEXT NOT NULL DEFAULT 'GIEŁDA'
                            CHECK (rodzaj_zlecenia IN ('GIEŁDA', 'KONTAKT')),
    cena_eur                DECIMAL(10,2),
    km                      INTEGER,
    status                  TEXT NOT NULL DEFAULT 'nowe'
                            CHECK (status IN ('nowe', 'w_trasie', 'zakonczone', 'anulowane')),
    pdf_url                 TEXT,               -- Supabase Storage URL
    pdf_drive_url           TEXT,               -- Google Drive URL (legacy n8n)
    wiadomosc_dla_kierowcy  TEXT,
    is_amazon               BOOLEAN NOT NULL DEFAULT false,
    adr                     BOOLEAN NOT NULL DEFAULT false,
    lift                    BOOLEAN NOT NULL DEFAULT false,
    palety_wymiana          BOOLEAN NOT NULL DEFAULT false,
    palety_ilosc            INTEGER,
    palety_gdzie            TEXT,
    wylot_granica           BOOLEAN NOT NULL DEFAULT false,
    wylot_przejscie         TEXT,
    powrot_granica          BOOLEAN NOT NULL DEFAULT false,
    powrot_przejscie        TEXT,
    ladunek_typ             TEXT,
    ladunek_waga            TEXT,
    ladunek_wymiary         TEXT,
    numery_referencyjne     TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zlecenia_updated_at
    BEFORE UPDATE ON public.zlecenia
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- --------------------------------------------------------
-- 6. ZAŁADUNKI (wiele na jedno zlecenie)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zaladunki (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zlecenie_id     UUID NOT NULL REFERENCES public.zlecenia(id) ON DELETE CASCADE,
    kolejnosc       INTEGER NOT NULL DEFAULT 1,
    nazwa_firmy     TEXT,
    ulica           TEXT,
    kod             TEXT,                       -- kod pocztowy: '69-100', '49744'
    miasto          TEXT,
    kraj            TEXT NOT NULL DEFAULT 'Niemcy',
    data            DATE,
    okno_od         TIME,
    okno_do         TIME,
    ma_okno         BOOLEAN NOT NULL DEFAULT false,
    nr_ref          TEXT
);

-- --------------------------------------------------------
-- 7. ROZŁADUNKI (wiele na jedno zlecenie)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rozladunki (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zlecenie_id     UUID NOT NULL REFERENCES public.zlecenia(id) ON DELETE CASCADE,
    kolejnosc       INTEGER NOT NULL DEFAULT 1,
    nazwa_firmy     TEXT,
    ulica           TEXT,
    kod             TEXT,
    miasto          TEXT,
    kraj            TEXT NOT NULL DEFAULT 'Niemcy',
    data            DATE,
    okno_od         TIME,
    okno_do         TIME,
    ma_okno         BOOLEAN NOT NULL DEFAULT false,
    nr_ref          TEXT
);

-- --------------------------------------------------------
-- 8. INDEKSY
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_zlecenia_vrid        ON public.zlecenia(vrid);
CREATE INDEX IF NOT EXISTS idx_zlecenia_nr_leo      ON public.zlecenia(nr_leo);
CREATE INDEX IF NOT EXISTS idx_zlecenia_status      ON public.zlecenia(status);
CREATE INDEX IF NOT EXISTS idx_zlecenia_data        ON public.zlecenia(data_przyjecia);
CREATE INDEX IF NOT EXISTS idx_zlecenia_kontrahent  ON public.zlecenia(kontrahent_id);
CREATE INDEX IF NOT EXISTS idx_zaladunki_zlecenie   ON public.zaladunki(zlecenie_id);
CREATE INDEX IF NOT EXISTS idx_rozladunki_zlecenie  ON public.rozladunki(zlecenie_id);
CREATE INDEX IF NOT EXISTS idx_kontrahenci_nip      ON public.kontrahenci(nip);
CREATE INDEX IF NOT EXISTS idx_kierowcy_leo         ON public.kierowcy(nr_leo);

-- --------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- --------------------------------------------------------
ALTER TABLE public.flota          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kierowcy       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kontrahenci    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zlecenia       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zaladunki      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rozladunki     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.flota          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.kierowcy       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.kontrahenci    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.zlecenia       FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.zaladunki      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.rozladunki     FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_read" ON public.flota          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.kierowcy       FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.kontrahenci    FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.zlecenia       FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.zaladunki      FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read" ON public.rozladunki     FOR SELECT TO anon USING (true);

-- --------------------------------------------------------
-- 10. WIDOK: zlecenia_full (do historii / listy)
-- --------------------------------------------------------
CREATE OR REPLACE VIEW public.zlecenia_full AS
SELECT
    z.id,
    z.vrid,
    z.numer_zlecenia,
    z.spedytor,
    z.nr_leo,
    z.data_przyjecia,
    z.rodzaj_zlecenia,
    z.cena_eur,
    z.km,
    z.status,
    z.pdf_url,
    z.wiadomosc_dla_kierowcy,
    z.is_amazon,
    z.adr,
    z.lift,
    z.palety_wymiana,
    z.ladunek_typ,
    z.ladunek_waga,
    z.created_at,
    k.nazwa        AS kontrahent_nazwa,
    k.nip          AS kontrahent_nip,
    k.kraj         AS kontrahent_kraj,
    f.typ          AS pojazd_typ,
    f.marka        AS pojazd_marka,
    f.rejestracja  AS pojazd_rejestracja,
    (SELECT zal.kod     FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS zaladunek_kod,
    (SELECT zal.miasto  FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS zaladunek_miasto,
    (SELECT zal.data    FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS data_zal,
    (SELECT roz.kod     FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS rozladunek_kod,
    (SELECT roz.miasto  FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS rozladunek_miasto,
    (SELECT roz.data    FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS data_roz
FROM public.zlecenia z
LEFT JOIN public.kontrahenci k ON k.id = z.kontrahent_id
LEFT JOIN public.flota f ON f.nr_leo = z.nr_leo;

-- ============================================================
-- GOTOWE. Sprawdź tabele: Table Editor w Supabase Dashboard
-- ============================================================
