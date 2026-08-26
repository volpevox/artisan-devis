-- Autorise un artisan a supprimer ses propres devis/factures (et leurs
-- lignes). Sans ca, la suppression est bloquee par la Row Level Security
-- (rls-policies.sql ne definit que select/insert/update, pas delete) : le
-- bouton "Supprimer" de l'appli echouerait silencieusement sans ce script.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

create policy "Un artisan supprime ses propres devis/factures"
  on devis for delete
  using (artisan_id in (select id from artisans where user_id = auth.uid()));

create policy "Un artisan supprime les lignes de ses devis/factures"
  on lignes_devis for delete
  using (
    devis_id in (
      select id from devis where artisan_id in (select id from artisans where user_id = auth.uid())
    )
  );
