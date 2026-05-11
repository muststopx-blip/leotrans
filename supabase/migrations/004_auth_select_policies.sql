-- ============================================================
-- LEOTRANS - Migracja 004: Polityki SELECT dla authenticated
-- Naprawia brak dostępu zalogowanych użytkowników do tabel
-- pomocniczych (poprzednio tylko anon_read).
-- Wklej w: Supabase SQL Editor > New query > Run
-- ============================================================

CREATE POLICY IF NOT EXISTS "auth_select" ON public.zaladunki
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "auth_select" ON public.rozladunki
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "auth_select" ON public.kontrahenci
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "auth_select" ON public.flota
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "auth_select" ON public.kierowcy
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "auth_insert" ON public.zaladunki
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "auth_insert" ON public.rozladunki
    FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- GOTOWE.
-- ============================================================
