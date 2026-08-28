-- =====================================================================
-- Interrupteur des relances automatiques  --  28/08/2026
-- =====================================================================
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> coller
-- ce fichier -> Run.
--
-- Ajoute "relances_actives" (booleen) sur "artisans". Valeur par defaut
-- true : le comportement actuel (relances J+3 / J+7 des devis non signes
-- et des factures impayees, via le cron Vercel) est inchange pour tous
-- les comptes existants.
--
-- Quand un artisan met ce reglage a false depuis la page Parametres, le
-- cron /api/cron/relances ne lui envoie plus aucune relance client.
--
-- RLS : colonne de "artisans", couverte par la policy existante
-- "un artisan modifie son propre profil". Aucun ajustement RLS.

alter table artisans
  add column if not exists relances_actives boolean not null default true;
