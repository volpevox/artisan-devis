-- Ajoute le SIREN du client sur les devis / factures (mention obligatoire
-- sur les factures entre professionnels, reforme de la facturation
-- electronique). Facultatif : rempli seulement quand le client est une
-- entreprise.
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> Run,
-- AVANT de mettre en ligne le code qui l'utilise.

alter table devis add column if not exists client_siren text;
