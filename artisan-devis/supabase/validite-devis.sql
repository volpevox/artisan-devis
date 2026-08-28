-- =====================================================================
-- Duree de validite des devis  --  28/08/2026
-- =====================================================================
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> coller
-- ce fichier -> Run.
--
-- Ajoute la colonne "duree_validite_devis" (nombre de jours) sur
-- "artisans". Valeur par defaut 30 : chaque devis portera desormais la
-- mention "Ce devis est valable jusqu'au <date + 30 jours>". L'artisan
-- peut changer la duree (15 / 30 / 45 / 60 / 90) ou la desactiver
-- (valeur 0) depuis la page Profil.
--
-- Ne concerne que les devis, pas les factures.
-- RLS : colonne de "artisans", couverte par la policy existante
-- "un artisan modifie son propre profil". Aucun ajustement RLS.

alter table artisans
  add column if not exists duree_validite_devis integer not null default 30;
