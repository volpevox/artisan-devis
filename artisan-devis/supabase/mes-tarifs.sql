-- Page « Mes tarifs » (Parametres) : l'artisan voit, ajoute, modifie et
-- supprime les tarifs de son carnet de prix (table prix_appris).
--
-- 1. Colonne "fixe" : true = tarif saisi a la main dans « Mes tarifs ».
--    L'apprentissage automatique (moyenne des devis) ne modifie plus son
--    prix. Les tarifs deja appris restent a false : rien ne change pour eux.
-- 2. Autorisation de supprimer un tarif (rls-policies.sql ne definit que
--    select/insert/update, pas delete).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table prix_appris
  add column if not exists fixe boolean not null default false;

create policy "Un artisan supprime ses propres prix appris"
  on prix_appris for delete
  using (artisan_id in (select id from artisans where user_id = auth.uid()));
