-- Nouveaux champs du profil artisan : nom et prenom (personne physique,
-- distinct du nom d'entreprise facultatif) et code postal (separe de
-- l'adresse pour pouvoir l'afficher correctement sur les devis/factures).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans
  add column if not exists nom_complet text,
  add column if not exists code_postal text;
