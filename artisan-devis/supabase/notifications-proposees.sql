-- Colonne necessaire pour proposer l'activation des notifications push a la
-- premiere ouverture de l'appli, une seule fois par artisan.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans
  add column if not exists notifications_proposees_le timestamptz;
