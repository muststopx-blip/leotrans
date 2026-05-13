-- Naprawia widok zlecenia_full:
-- 1. Dodaje zal_kody_trasa / roz_kody_trasa (kraj ISO + czysty kod pocztowy)
-- 2. Dodaje data_roz_ostatni (data ostatniego rozładunku)
-- 3. Defensywnie strippuje prefix kraju z kodu pocztowego (np. DE89597 → 89597)

-- Helper: nazwa kraju → 2-literowy ISO
CREATE OR REPLACE FUNCTION public.kraj_to_iso(kraj TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN CASE LOWER(TRIM(COALESCE(kraj, '')))
    WHEN 'polska'          THEN 'PL' WHEN 'poland'         THEN 'PL'
    WHEN 'niemcy'          THEN 'DE' WHEN 'germany'        THEN 'DE' WHEN 'deutschland' THEN 'DE'
    WHEN 'czechy'          THEN 'CZ' WHEN 'czech republic' THEN 'CZ' WHEN 'česká'       THEN 'CZ'
    WHEN 'austria'         THEN 'AT' WHEN 'österreich'     THEN 'AT'
    WHEN 'francja'         THEN 'FR' WHEN 'france'         THEN 'FR' WHEN 'frankreich'  THEN 'FR'
    WHEN 'wlochy'          THEN 'IT' WHEN 'włochy'         THEN 'IT' WHEN 'italy'       THEN 'IT'
    WHEN 'hiszpania'       THEN 'ES' WHEN 'spain'          THEN 'ES'
    WHEN 'slowacja'        THEN 'SK' WHEN 'słowacja'       THEN 'SK' WHEN 'slovakia'    THEN 'SK'
    WHEN 'wegry'           THEN 'HU' WHEN 'węgry'          THEN 'HU' WHEN 'hungary'     THEN 'HU'
    WHEN 'holandia'        THEN 'NL' WHEN 'netherlands'    THEN 'NL' WHEN 'niederlande' THEN 'NL'
    WHEN 'belgia'          THEN 'BE' WHEN 'belgium'        THEN 'BE'
    WHEN 'rumunia'         THEN 'RO' WHEN 'romania'        THEN 'RO'
    WHEN 'szwajcaria'      THEN 'CH' WHEN 'switzerland'    THEN 'CH'
    WHEN 'wielka brytania' THEN 'GB' WHEN 'uk'             THEN 'GB'
    ELSE
      CASE WHEN LENGTH(TRIM(COALESCE(kraj, ''))) = 2
        THEN UPPER(TRIM(kraj))
        ELSE NULL
      END
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: usuń prefix kraju z kodu pocztowego jeśli jest
CREATE OR REPLACE FUNCTION public.clean_postal_code(kod TEXT, iso TEXT) RETURNS TEXT AS $$
BEGIN
  IF kod IS NULL OR kod = '' THEN RETURN kod; END IF;
  -- Usuń 2-literowy prefix kraju jeśli się zgadza (np. 'DE89597' → '89597')
  IF iso IS NOT NULL AND LENGTH(kod) > 2 AND UPPER(LEFT(kod, 2)) = iso THEN
    RETURN SUBSTRING(kod FROM 3);
  END IF;
  RETURN kod;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Przebuduj widok
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
    z.enrichment_error, z.spedtrans_row,
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
    -- Pierwsze załadunek
    (SELECT zal.kod    FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS zaladunek_kod,
    (SELECT zal.miasto FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS zaladunek_miasto,
    (SELECT zal.data   FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1) AS data_zal,
    -- Pierwszy rozładunek
    (SELECT roz.kod    FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS rozladunek_kod,
    (SELECT roz.miasto FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS rozladunek_miasto,
    (SELECT roz.data   FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc LIMIT 1) AS data_roz,
    -- Ostatni rozładunek (multi-stop)
    (SELECT roz.data   FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc DESC LIMIT 1) AS data_roz_ostatni,
    -- Kody trasy: ISO_kraju + czysty_kod (np. DE89597, PL00-807)
    (SELECT
        COALESCE(public.kraj_to_iso(zal.kraj), '') ||
        COALESCE(public.clean_postal_code(zal.kod, public.kraj_to_iso(zal.kraj)), '')
     FROM public.zaladunki zal WHERE zal.zlecenie_id = z.id ORDER BY zal.kolejnosc LIMIT 1
    ) AS zal_kody_trasa,
    (SELECT
        COALESCE(public.kraj_to_iso(roz.kraj), '') ||
        COALESCE(public.clean_postal_code(roz.kod, public.kraj_to_iso(roz.kraj)), '')
     FROM public.rozladunki roz WHERE roz.zlecenie_id = z.id ORDER BY roz.kolejnosc DESC LIMIT 1
    ) AS roz_kody_trasa
FROM public.zlecenia z
LEFT JOIN public.kontrahenci k ON k.id = z.kontrahent_id
LEFT JOIN public.flota f       ON f.nr_leo = z.nr_leo
LEFT JOIN public.profile p     ON p.id = z.created_by
LEFT JOIN public.stoly s       ON s.id = z.stol_id;
