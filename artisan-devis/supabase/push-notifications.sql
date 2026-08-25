-- Table de stockage des abonnements aux notifications push (Web Push / VAPID).
-- Un artisan peut avoir plusieurs lignes (un par appareil/navigateur abonne).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references artisans(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_artisan_id_idx on push_subscriptions(artisan_id);
