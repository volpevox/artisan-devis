-- Date de debut et duree estimee de la prestation, affichees sur le devis
-- (mention obligatoire pour les travaux chez un particulier). En texte
-- libre, tel que dicte : « lundi 6 octobre 2026 », « début novembre »,
-- « 3 jours ». Facultatives.
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> Run,
-- AVANT de mettre en ligne le code qui l'utilise.

alter table devis add column if not exists debut_prestation text;
alter table devis add column if not exists duree_prestation text;
