-- Ajoute le telephone du client sur les devis / factures.
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> Run.
--
-- Le prenom et la raison sociale du client ne sont PAS stockes separement :
-- l'app compose "Prenom Nom" (ou la raison sociale si le client est une
-- entreprise) dans la colonne existante client_nom au moment de l'enregistrement.

alter table devis add column if not exists client_telephone text;
