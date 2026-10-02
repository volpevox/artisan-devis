-- Fenetre « Ton devis est presque pret » (profil incomplet : assurance,
-- mediateur, logo), proposee une seule fois par compte, au premier
-- apercu/envoi d'un devis. Date a laquelle l'artisan l'a fermee.
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> Run,
-- AVANT de mettre en ligne le code qui l'utilise.

alter table artisans add column if not exists popup_profil_vue_le timestamptz;
