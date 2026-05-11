-- ============================================================
-- LEOTRANS - Migracja 002: Użytkownicy, Amazon, Enrichment
-- ============================================================

-- --------------------------------------------------------
-- 1. PROFILE (rozszerza Supabase Auth)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    imie_nazwisko   TEXT NOT NULL,
    inicjaly        TEXT,                        -- 'AW', 'AT' do pola sped/stol
    rola            TEXT NOT NULL DEFAULT 'spedytor'
                    CHECK (rola IN ('admin', 'manager', 'spedytor')),
    aktywny         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-create profile przy rejestracji
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profile(id, imie_nazwisko, inicjaly)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'imie_nazwisko', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'inicjaly', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Dodaj created_by do zleceń
ALTER TABLE public.zlecenia
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS enrichment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (enrichment_status IN ('pending', 'processing', 'done', 'error')),
    ADD COLUMN IF NOT EXISTS enrichment_error TEXT,
    ADD COLUMN IF NOT EXISTS spedtrans_row JSONB;

-- --------------------------------------------------------
-- 2. AMAZON_ZLECENIA
-- Zlecenia Amazon przychodzą mailem/Excelem - inny flow
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.amazon_zlecenia (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zlecenie_id     UUID REFERENCES public.zlecenia(id) ON DELETE SET NULL,
    amazon_ref      TEXT,                        -- numer zamówienia Amazon
    fc_kod          TEXT,                        -- fulfillment center kod np. 'FRA3'
    appointment_id  TEXT,
    zrodlo          TEXT NOT NULL DEFAULT 'email'
                    CHECK (zrodlo IN ('email', 'excel', 'manual')),
    raw_data        JSONB,                       -- oryginalne dane z maila/Excela
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processed', 'linked', 'error')),
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 3. SPEDTRANS_EXPORT (gotowe wiersze dla SpedTrans)
-- Każde zlecenie generuje 1 wiersz w tym formacie
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spedtrans_export (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zlecenie_id                 UUID UNIQUE REFERENCES public.zlecenia(id) ON DELETE CASCADE,
    -- Dane wg schematu Google Sheets "SPEDZIK" z n8n
    zleceniodawca_nazwa         TEXT,
    zleceniodawca_nip           TEXT,
    zleceniodawca_kod_pocztowy  TEXT,
    cena_eur                    TEXT,
    zaladunek_kod               TEXT,
    zaladunek_miasto            TEXT,
    zaladunek_ulica             TEXT,
    rozladunek_kod              TEXT,
    rozladunek_miasto           TEXT,
    rozladunek_ulica            TEXT,
    numer_zlecenia              TEXT,
    pdf_link                    TEXT,            -- webviewlink
    spedytor_stol               TEXT,            -- sped/stol
    leo                         TEXT,
    km                          TEXT,
    data_roz                    TEXT,
    data_zal                    TEXT,
    wiadomosc_dla_kierowcy      TEXT,
    -- Meta
    exported_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 4. RLS dla nowych tabel
-- --------------------------------------------------------
ALTER TABLE public.profile          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_zlecenia  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spedtrans_export ENABLE ROW LEVEL SECURITY;

-- Profile: każdy widzi swój profil, admin widzi wszystkie
CREATE POLICY "own_profile" ON public.profile
    FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "admin_all_profiles" ON public.profile
    FOR ALL TO authenticated
    USING ((SELECT rola FROM public.profile WHERE id = auth.uid()) IN ('admin', 'manager'));

-- Amazon: spedytorzy mogą tworzyć i czytać
CREATE POLICY "auth_all" ON public.amazon_zlecenia
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SpedTrans: tylko do odczytu dla spedytorów
CREATE POLICY "auth_read" ON public.spedtrans_export
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_write" ON public.spedtrans_export
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service role dla wszystkich
CREATE POLICY "service_role_all" ON public.profile
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON public.amazon_zlecenia
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Aktualizuj RLS na zlecenia (authenticated users mogą tworzyć)
CREATE POLICY "auth_insert" ON public.zlecenia
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_select" ON public.zlecenia
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_update_own" ON public.zlecenia
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR
           (SELECT rola FROM public.profile WHERE id = auth.uid()) IN ('admin', 'manager'));

-- --------------------------------------------------------
-- 5. INDEKSY
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_zlecenia_enrichment  ON public.zlecenia(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_zlecenia_created_by  ON public.zlecenia(created_by);
CREATE INDEX IF NOT EXISTS idx_amazon_zlecenie_id   ON public.amazon_zlecenia(zlecenie_id);
CREATE INDEX IF NOT EXISTS idx_spedtrans_zlecenie   ON public.spedtrans_export(zlecenie_id);

-- ============================================================
-- GOTOWE.
-- ============================================================
