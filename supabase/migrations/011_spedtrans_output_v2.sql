-- Dodaje brakujące kolumny do spedtrans_output (dopasowanie do 81-kolumnowego formatu SpedTrans)
-- Istniejące kolumny są zachowane bez zmian

ALTER TABLE public.spedtrans_output
  ADD COLUMN IF NOT EXISTS "ID_OBCE"    TEXT,   -- VRID (AI2026/05/00001)
  ADD COLUMN IF NOT EXISTS "INFO_WEW"   TEXT,   -- puste
  ADD COLUMN IF NOT EXISTS "SKROT_ZAL"  TEXT,   -- krótka nazwa miejsca załadunku
  ADD COLUMN IF NOT EXISTS "NIP_ZAL"    TEXT,   -- puste (brak w DB)
  ADD COLUMN IF NOT EXISTS "TELEFON_ZAL" TEXT,  -- kontakt_telefon załadunku
  ADD COLUMN IF NOT EXISTS "NR_REF_ZAL" TEXT,   -- nr_ref załadunku
  ADD COLUMN IF NOT EXISTS "UWAGI_ZAL"  TEXT,   -- dodatkowe_info załadunku
  ADD COLUMN IF NOT EXISTS "SKROT_ROZ"  TEXT,   -- krótka nazwa miejsca rozładunku
  ADD COLUMN IF NOT EXISTS "NIP_ROZ"    TEXT,   -- puste
  ADD COLUMN IF NOT EXISTS "TELEFON_ROZ" TEXT,  -- kontakt_telefon rozładunku
  ADD COLUMN IF NOT EXISTS "NR_REF_ROZ" TEXT,   -- nr_ref rozładunku
  ADD COLUMN IF NOT EXISTS "UWAGI_ROZ"  TEXT,   -- dodatkowe_info rozładunku
  ADD COLUMN IF NOT EXISTS "TYP_LAD"    TEXT,   -- typ załadunku (puste)
  ADD COLUMN IF NOT EXISTS "INFO_TOW"   TEXT;   -- ladunek_typ + waga + wymiary
