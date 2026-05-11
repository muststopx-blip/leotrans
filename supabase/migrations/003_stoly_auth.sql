-- ============================================================
-- LEOTRANS - Migracja 003: Stoły i autoryzacja
-- ============================================================

-- --------------------------------------------------------
-- 1. STOŁY (grupy robocze spedytorów)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stoly (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazwa       TEXT NOT NULL UNIQUE,   -- 'Stół 1', 'Stół A', 'Stół Eksport'
    skrot       TEXT,                   -- skrót do SpedTrans: 'S1', 'SA'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stoly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read"       ON public.stoly FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write"     ON public.stoly FOR ALL TO authenticated
    USING   ((SELECT rola FROM public.profile WHERE id = auth.uid()) = 'admin')
    WITH CHECK ((SELECT rola FROM public.profile WHERE id = auth.uid()) = 'admin');
CREATE POLICY "service_role_all" ON public.stoly FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --------------------------------------------------------
-- 2. PROFILE: dodaj stol_id
-- --------------------------------------------------------
ALTER TABLE public.profile
    ADD COLUMN IF NOT EXISTS stol_id UUID REFERENCES public.stoly(id) ON DELETE SET NULL;

-- --------------------------------------------------------
-- 3. ZLECENIA: dodaj rodzaj_spedytora i stol_id
-- --------------------------------------------------------
ALTER TABLE public.zlecenia
    ADD COLUMN IF NOT EXISTS rodzaj_spedytora TEXT DEFAULT 'solo'
        CHECK (rodzaj_spedytora IN ('solo', 'stol')),
    ADD COLUMN IF NOT EXISTS stol_id UUID REFERENCES public.stoly(id) ON DELETE SET NULL;

-- --------------------------------------------------------
-- 4. RLS na zlecenia — zaktualizuj polityki
-- --------------------------------------------------------
-- Usuń stare (zbyt permisywne) polityki
DROP POLICY IF EXISTS "auth_select"     ON public.zlecenia;
DROP POLICY IF EXISTS "auth_insert"     ON public.zlecenia;
DROP POLICY IF EXISTS "auth_update_own" ON public.zlecenia;

-- Admin widzi wszystko, spedytor widzi swoje + stołu
CREATE POLICY "auth_select" ON public.zlecenia
    FOR SELECT TO authenticated
    USING (
        (SELECT rola FROM public.profile WHERE id = auth.uid()) = 'admin'
        OR created_by = auth.uid()
        OR (
            stol_id IS NOT NULL AND
            stol_id = (SELECT stol_id FROM public.profile WHERE id = auth.uid())
        )
    );

CREATE POLICY "auth_insert" ON public.zlecenia
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update" ON public.zlecenia
    FOR UPDATE TO authenticated
    USING (
        (SELECT rola FROM public.profile WHERE id = auth.uid()) = 'admin'
        OR created_by = auth.uid()
        OR (
            stol_id IS NOT NULL AND
            stol_id = (SELECT stol_id FROM public.profile WHERE id = auth.uid())
        )
    );

-- --------------------------------------------------------
-- 5. Aktualizuj widok zlecenia_full (dodaj pola spedytora/stołu)
-- --------------------------------------------------------
DROP VIEW IF EXISTS public.zlecenia_full CASCADE;
CREATE OR REPLACE VIEW public.zlecenia_full AS
SELECT
    z.id, z.vrid, z.numer_zlecenia, z.spedytor, z.nr_leo,
    z.data_przyjecia, z.rodzaj_zlecenia, z.cena_eur, z.km, z.status,
    z.pdf_url, z.wiadomosc_dla_kierowcy, z.is_amazon, z.adr, z.lift,
    z.palety_wymiana, z.ladunek_typ, z.ladunek_waga, z.created_at,
    z.created_by, z.rodzaj_spedytora, z.stol_id, z.enrichment_status,
    k.nazwa          AS kontrahent_nazwa,
    k.nip            AS kontrahent_nip,
    f.typ            AS pojazd_typ,
    f.marka          AS pojazd_marka,
    f.rejestracja    AS pojazd_rejestracja,
    p.imie_nazwisko  AS spedytor_imie,
    p.inicjaly       AS spedytor_inicjaly,
    s.nazwa          AS stol_nazwa,
    s.skrot          AS stol_skrot,
    (SELECT zal.kod    FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS zaladunek_kod,
    (SELECT zal.miasto FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS zaladunek_miasto,
    (SELECT zal.data   FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS data_zal,
    (SELECT roz.kod    FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS rozladunek_kod,
    (SELECT roz.miasto FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS rozladunek_miasto,
    (SELECT roz.data   FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS data_roz
FROM public.zlecenia z
LEFT JOIN public.kontrahenci k ON k.id = z.kontrahent_id
LEFT JOIN public.flota f       ON f.nr_leo = z.nr_leo
LEFT JOIN public.profile p     ON p.id = z.created_by
LEFT JOIN public.stoly s       ON s.id = z.stol_id;

-- --------------------------------------------------------
-- 6. Indeksy
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_zlecenia_stol    ON public.zlecenia(stol_id);
CREATE INDEX IF NOT EXISTS idx_profile_stol     ON public.profile(stol_id);

-- --------------------------------------------------------
-- 7. OTP CODES (weryfikacja dwuetapowa)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,      -- SHA-256 kodu
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.otp_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_otp_user ON public.otp_codes(user_id, expires_at);

-- ============================================================
-- GOTOWE. Teraz dodaj stoły w Table Editor: public.stoly
-- ============================================================
