-- Archivage des factures (rangement) : une facture reglee ou annulee peut
-- etre archivee pour disparaitre de la liste principale. Elle n'est PAS
-- supprimee (conservation legale 10 ans) : on la retrouve dans « Archives »,
-- elle reste dans l'export comptable et les totaux.
-- A executer une fois dans le SQL Editor de Supabase.

alter table devis add column if not exists archivee_le timestamptz;
