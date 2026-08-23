-- Lieu de signature du devis, renseigne par le client sur la page de
-- signature (utilise pour "Fait a [lieu], le [date de signature]" sur le
-- PDF du devis).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table devis
  add column if not exists lieu_signature text;
