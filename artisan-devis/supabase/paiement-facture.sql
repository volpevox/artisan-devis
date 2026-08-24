-- Colonnes necessaires pour le paiement en ligne des factures (Stripe Connect).
-- Chaque artisan a son propre compte Stripe connecte : l'argent des factures
-- payees en ligne va directement a l'artisan, jamais a VolpeVox.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans
  add column if not exists stripe_account_id text,
  add column if not exists stripe_paiement_actif boolean not null default false;
