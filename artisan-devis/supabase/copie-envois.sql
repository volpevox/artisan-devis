-- =====================================================================
-- Recevoir une copie de ses envois  --  28/08/2026
-- =====================================================================
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> coller
-- ce fichier -> Run.
--
-- Ajoute "copie_envois" (booleen) sur "artisans". Valeur par defaut
-- false : aucun mail supplementaire n'est envoye tant que l'artisan
-- n'active pas ce reglage depuis la page Parametres.
--
-- Active = l'artisan est mis en copie cachee (BCC) de chaque devis /
-- facture qu'il envoie a son client (routes /api/envoyer et
-- /api/facture/[id]). Ne concerne pas les relances automatiques.
--
-- RLS : colonne de "artisans", couverte par la policy existante
-- "un artisan modifie son propre profil". Aucun ajustement RLS.

alter table artisans
  add column if not exists copie_envois boolean not null default false;
