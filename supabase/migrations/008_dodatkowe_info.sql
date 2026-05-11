-- Dodaj pole dodatkowe_info do załadunków i rozładunków
ALTER TABLE zaladunki ADD COLUMN IF NOT EXISTS dodatkowe_info TEXT;
ALTER TABLE rozladunki ADD COLUMN IF NOT EXISTS dodatkowe_info TEXT;
