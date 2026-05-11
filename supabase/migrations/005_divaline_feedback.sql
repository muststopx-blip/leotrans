-- Tabela dla anonimowych odpowiedzi z formularza Divaline
-- Uruchomić w: Supabase Dashboard → SQL Editor (projekt LEOTRANS lub dedykowany projekt Divaline)

CREATE TABLE IF NOT EXISTS public.divaline_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obszar          TEXT,           -- obszar procesu (zlecenia, dokumentacja, itp.)
  problem         TEXT NOT NULL,  -- opis problemu
  propozycja      TEXT,           -- propozycja usprawnienia
  czestotliwosc   TEXT,           -- codziennie / kilka razy / rzadziej
  priorytet       TEXT,           -- krytyczne / wazne / przydatne
  rola            TEXT,           -- rola ankietowanego (opcjonalna)
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.divaline_feedback ENABLE ROW LEVEL SECURITY;

-- Tylko INSERT dla anonimowych (nikt nie może czytać odpowiedzi przez API)
CREATE POLICY "anon_insert_feedback"
  ON public.divaline_feedback
  FOR INSERT TO anon
  WITH CHECK (true);

-- Admini mogą czytać
CREATE POLICY "auth_select_feedback"
  ON public.divaline_feedback
  FOR SELECT TO authenticated
  USING (true);
