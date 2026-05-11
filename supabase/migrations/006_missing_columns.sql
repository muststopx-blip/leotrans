-- Brakujące kolumny (rodzaj_spedytora, stol_id, enrichment_status, created_by są już z 002/003)
ALTER TABLE public.zlecenia
  ADD COLUMN IF NOT EXISTS pod_link TEXT,
  ADD COLUMN IF NOT EXISTS ai_insights TEXT;

-- Brakujące kolumny w zaladunki / rozladunki
ALTER TABLE public.zaladunki
  ADD COLUMN IF NOT EXISTS kontakt_imie TEXT,
  ADD COLUMN IF NOT EXISTS kontakt_telefon TEXT;

ALTER TABLE public.rozladunki
  ADD COLUMN IF NOT EXISTS kontakt_imie TEXT,
  ADD COLUMN IF NOT EXISTS kontakt_telefon TEXT;

-- Zaktualizuj widok zlecenia_full o nowe pola
DROP VIEW IF EXISTS public.zlecenia_full CASCADE;
CREATE OR REPLACE VIEW public.zlecenia_full AS
SELECT
    z.id, z.vrid, z.numer_zlecenia, z.spedytor, z.nr_leo,
    z.data_przyjecia, z.rodzaj_zlecenia, z.cena_eur, z.km, z.status,
    z.pdf_url, z.wiadomosc_dla_kierowcy, z.is_amazon, z.adr, z.lift,
    z.palety_wymiana, z.ladunek_typ, z.ladunek_waga, z.created_at,
    z.created_by, z.rodzaj_spedytora, z.stol_id, z.enrichment_status,
    z.pod_link, z.ai_insights,
    z.numery_referencyjne, z.ladunek_wymiary,
    z.palety_ilosc, z.palety_gdzie,
    z.wylot_granica, z.wylot_przejscie,
    z.powrot_granica, z.powrot_przejscie,
    k.nazwa          AS kontrahent_nazwa,
    k.nip            AS kontrahent_nip,
    k.email          AS kontrahent_email,
    k.telefon        AS kontrahent_telefon,
    k.adres_ulica    AS kontrahent_adres,
    k.adres_kod      AS kontrahent_kod,
    k.adres_miasto   AS kontrahent_miasto,
    k.kraj           AS kontrahent_kraj,
    f.typ            AS pojazd_typ,
    f.marka          AS pojazd_marka,
    f.rejestracja    AS pojazd_rejestracja,
    f.rejestracja_naczepa AS pojazd_naczepa,
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
