-- Ajoute une colonne d'ordre sur les lignes de devis, pour garder les
-- prestations dans l'ordre dicte quand un devis en a plusieurs.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table lignes_devis
  add column if not exists ordre integer not null default 0;
