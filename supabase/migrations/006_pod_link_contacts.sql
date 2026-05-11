-- Dodaj pola: POD link, email/tel kontrahenta, kontakty klienta per stop
ALTER TABLE zlecenia ADD COLUMN IF NOT EXISTS pod_link TEXT;
ALTER TABLE zlecenia ADD COLUMN IF NOT EXISTS kontrahent_email TEXT;
ALTER TABLE zlecenia ADD COLUMN IF NOT EXISTS kontrahent_telefon TEXT;
ALTER TABLE zlecenia ADD COLUMN IF NOT EXISTS ladunek_ilosc TEXT;
ALTER TABLE zlecenia ADD COLUMN IF NOT EXISTS ladunek_ldm TEXT;

ALTER TABLE zaladunki ADD COLUMN IF NOT EXISTS kontakt_imie TEXT;
ALTER TABLE zaladunki ADD COLUMN IF NOT EXISTS kontakt_telefon TEXT;

ALTER TABLE rozladunki ADD COLUMN IF NOT EXISTS kontakt_imie TEXT;
ALTER TABLE rozladunki ADD COLUMN IF NOT EXISTS kontakt_telefon TEXT;
