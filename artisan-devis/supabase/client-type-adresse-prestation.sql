-- Type de client (particulier / professionnel) et adresse de la prestation
-- quand elle differe de l'adresse du client. Sert a afficher les bonnes
-- mentions sur le PDF (particulier : retractation, mediateur... ;
-- professionnel : penalites, indemnite 40 EUR).
-- Anciens documents : client_type vide = deduit du SIREN (rempli = pro).
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> Run,
-- AVANT de mettre en ligne le code qui l'utilise.

alter table devis add column if not exists client_type text
  check (client_type in ('particulier', 'professionnel'));
alter table devis add column if not exists adresse_prestation text;
