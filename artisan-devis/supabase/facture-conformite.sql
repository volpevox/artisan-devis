-- Colonnes necessaires pour la conformite legale des factures et le lieu/date.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans
  add column if not exists ville text;

alter table devis
  add column if not exists date_prestation date,
  add column if not exists payee_le timestamptz,
  add column if not exists moyen_paiement text;
