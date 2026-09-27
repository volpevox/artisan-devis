-- Majorations reglables par chaque artisan (page « Mes tarifs », bloc
-- « Majorations ») : pourcentages ajoutes au tarif pour le travail de nuit,
-- le dimanche et les jours feries. Elles s'additionnent (nuit + dimanche =
-- +20 % avec les valeurs de depart). Valeurs de depart : 10 / 10 / 100 --
-- chaque artisan les modifie ou les met a 0.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans
  add column if not exists majoration_nuit numeric not null default 10
    check (majoration_nuit >= 0 and majoration_nuit <= 500),
  add column if not exists majoration_dimanche numeric not null default 10
    check (majoration_dimanche >= 0 and majoration_dimanche <= 500),
  add column if not exists majoration_ferie numeric not null default 100
    check (majoration_ferie >= 0 and majoration_ferie <= 500);
