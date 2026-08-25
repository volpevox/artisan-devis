-- Colonne necessaire pour la pastille "facture non vue" (menu du haut et du
-- bas) : marquee des que l'artisan ouvre l'onglet Factures, comme
-- signature_vue_le pour les devis.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table devis
  add column if not exists facture_vue_le timestamptz;
