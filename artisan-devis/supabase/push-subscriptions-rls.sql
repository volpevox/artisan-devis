-- Active la Row Level Security (RLS) sur push_subscriptions, seule table
-- qui n'en avait pas encore (voir supabase/rls-policies.sql pour le detail
-- du fonctionnement general).
--
-- Sans cette policy, la cle publique (anon), visible dans le code du
-- navigateur, pourrait en theorie lire/modifier directement cette table via
-- l'API Supabase, en contournant completement l'appli.
--
-- Sans impact sur le fonctionnement actuel : les routes qui lisent/ecrivent
-- cette table (app/api/push/subscribe, app/api/push/unsubscribe,
-- lib/pushNotifications.ts) utilisent deja la cle de service
-- (createAdminSupabase), qui contourne la RLS par design.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table push_subscriptions enable row level security;

create policy "Un artisan voit ses propres abonnements push"
  on push_subscriptions for select
  using (artisan_id in (select id from artisans where user_id = auth.uid()));

create policy "Un artisan cree ses propres abonnements push"
  on push_subscriptions for insert
  with check (artisan_id in (select id from artisans where user_id = auth.uid()));

create policy "Un artisan modifie ses propres abonnements push"
  on push_subscriptions for update
  using (artisan_id in (select id from artisans where user_id = auth.uid()))
  with check (artisan_id in (select id from artisans where user_id = auth.uid()));

create policy "Un artisan supprime ses propres abonnements push"
  on push_subscriptions for delete
  using (artisan_id in (select id from artisans where user_id = auth.uid()));
