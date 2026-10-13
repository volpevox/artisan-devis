-- Texte des dictees, pour le tableau de bord /admin (voir ce que les inscrits
-- ont dit et si l'IA a bien compris).
--
-- Seulement le texte transcrit, jamais l'audio. Ecrit par /api/transcrire,
-- lu par /api/admin, efface apres 90 jours par le cron quotidien
-- (/api/cron/relances) et avec le compte (on delete cascade).
--
-- RLS activee SANS aucune policy : ni la cle publique ni un artisan connecte
-- ne peuvent lire cette table, seul le serveur (cle de service) y accede.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

create table if not exists dictees (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references artisans(id) on delete cascade,
  texte text not null,
  created_at timestamptz not null default now()
);

create index if not exists dictees_artisan_created_idx on dictees (artisan_id, created_at desc);

alter table dictees enable row level security;
