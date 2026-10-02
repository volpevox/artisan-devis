-- =====================================================================
-- Factures d'acompte  --  02/10/2026
-- =====================================================================
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> coller
-- ce fichier -> Run.  A FAIRE AVANT la mise en ligne du code.
--
-- Un devis signe peut recevoir UNE facture d'acompte (ex : 30 % a la
-- signature). Elle est stockee sur la ligne du devis, comme l'avoir : pas
-- de nouvelle ligne, donc les listes et relances existantes ne la
-- prennent pas pour une facture a part.
-- Son numero est pris dans la meme suite que les factures
-- (numero_facture_suivant) : une facture d'acompte est une facture.
-- La facture finale (meme ligne, est_facture = true) deduit l'acompte.
--
-- RLS : colonnes de "devis", couvertes par les policies existantes.

alter table devis
  add column if not exists acompte_numero integer,
  add column if not exists acompte_montant numeric,       -- TTC
  add column if not exists acompte_pourcentage numeric,   -- pour l'affichage, peut etre vide (montant libre)
  add column if not exists acompte_cree_le timestamptz,
  add column if not exists acompte_payee_le timestamptz,
  add column if not exists acompte_moyen_paiement text;
