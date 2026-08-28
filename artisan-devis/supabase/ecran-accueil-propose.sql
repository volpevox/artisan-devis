-- =====================================================================
-- "Ajouter a l'ecran d'accueil" : proposee une fois par artisan  --  28/08/2026
-- =====================================================================
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> coller
-- ce fichier -> Run.
--
-- Ajoute "ecran_accueil_propose_le" (timestamp) sur "artisans", meme
-- principe que "notifications_proposees_le" : rempli au moment ou l'appli
-- a montre le popup "Ajoute VolpeVox a ton ecran d'accueil", pour ne le
-- montrer qu'une seule fois. Null par defaut => le popup s'affichera a la
-- premiere ouverture (sauf si l'appli tourne deja en mode standalone).
--
-- RLS : colonne de "artisans", couverte par la policy existante
-- "un artisan modifie son propre profil". Aucun ajustement RLS.

alter table artisans
  add column if not exists ecran_accueil_propose_le timestamptz;
