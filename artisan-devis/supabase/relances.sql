-- Colonnes necessaires pour les relances automatiques et la notification
-- artisan a la signature.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table devis
  add column if not exists envoye_le timestamptz,
  add column if not exists relance_j3_envoyee_le timestamptz,
  add column if not exists relance_j7_envoyee_le timestamptz,
  add column if not exists signature_vue_le timestamptz;
