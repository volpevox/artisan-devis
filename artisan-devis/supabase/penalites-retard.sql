-- =====================================================================
-- Mention personnalisable des penalites de retard (factures)  --  28/08/2026
-- =====================================================================
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> coller
-- ce fichier -> Run.
--
-- Ajoute "penalites_retard" (texte) sur "artisans". Quand ce champ est
-- vide, les factures affichent la mention legale par defaut (taux legal
-- majore de 10 points + indemnite forfaitaire de 40 EUR, art. L441-10).
-- Un artisan qui a une formulation CGV specifique la saisit depuis la
-- page Profil et elle remplace le texte par defaut.
--
-- Colonne nullable, pas de valeur par defaut : le repli vit cote appli
-- (constante MENTION_PENALITES_RETARD_DEFAUT). Rien ne change tant que
-- le champ n'est pas rempli.
--
-- RLS : colonne de "artisans", couverte par la policy existante
-- "un artisan modifie son propre profil". Aucun ajustement RLS.

alter table artisans
  add column if not exists penalites_retard text;
