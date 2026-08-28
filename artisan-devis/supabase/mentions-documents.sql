-- =====================================================================
-- Mentions legales affichees sur les devis et factures  --  28/08/2026
-- =====================================================================
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> coller
-- ce fichier -> Run.
--
-- Ajoute deux colonnes texte facultatives sur "artisans" :
--   - assurance_pro   : mention d'assurance professionnelle / decennale
--                       (assureur, n° de contrat, zone couverte)
--   - mediateur_conso : coordonnees du mediateur de la consommation
--                       (obligatoire pour qui vend a des particuliers)
--
-- Ces deux champs se remplissent depuis la page Profil et apparaissent
-- dans le pied de page des PDF (devis et factures), sous les conditions
-- de paiement. Vides par defaut : rien ne change tant qu'ils ne sont
-- pas renseignes.
--
-- RLS : ce sont des colonnes de "artisans", couvertes par la policy
-- existante "un artisan modifie son propre profil". Aucun ajustement RLS.

alter table artisans
  add column if not exists assurance_pro text,
  add column if not exists mediateur_conso text;
