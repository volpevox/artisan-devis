-- =====================================================================
-- Acces gratuit (sans Stripe) : liste geree dans Supabase
-- =====================================================================
-- Remplace la variable Vercel EMAILS_ACCES_GRATUIT. A executer UNE FOIS
-- dans le SQL Editor de Supabase.
--
-- Apres migration : ajouter / retirer un testeur = editer cette table
-- (Table Editor Supabase), effet immediat, AUCUN redeploiement Vercel.
--
-- La route /api/activer-invite lit cette table en priorite et continue de
-- lire la variable Vercel EMAILS_ACCES_GRATUIT en complement (union) tant
-- qu'elle existe. Une fois tous les emails repris ici, la variable peut
-- etre supprimee de Vercel sans risque.
-- =====================================================================

create table if not exists acces_gratuit_emails (
  email      text primary key,
  actif      boolean not null default true,   -- passer a false pour desactiver sans supprimer la ligne
  note       text,                            -- libre : "ami", "artisan essai", ...
  ajoute_le  timestamptz not null default now()
);

-- Normalise l'email en minuscules a l'ecriture : la comparaison cote route
-- se fait en minuscules, donc la ligne doit l'etre aussi.
create or replace function acces_gratuit_emails_normalise()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists trg_acces_gratuit_emails_normalise on acces_gratuit_emails;
create trigger trg_acces_gratuit_emails_normalise
  before insert or update on acces_gratuit_emails
  for each row execute function acces_gratuit_emails_normalise();

-- RLS : la cle publique ne doit rien pouvoir lire ici. Seules les routes API
-- serveur y accedent, via SUPABASE_SERVICE_ROLE_KEY, qui contourne RLS.
alter table acces_gratuit_emails enable row level security;
-- (aucune policy => aucun acces via la cle anon)

-- ---------------------------------------------------------------------
-- Reprendre ici les emails actuellement dans la variable Vercel
-- EMAILS_ACCES_GRATUIT (decommenter et adapter) :
-- ---------------------------------------------------------------------
-- insert into acces_gratuit_emails (email, note) values
--   ('ami1@exemple.fr',   'beta testeur'),
--   ('artisan1@exemple.fr','artisan essai gratuit')
-- on conflict (email) do nothing;

-- ---------------------------------------------------------------------
-- Revoquer un acces DEJA accorde : retirer l'email de la table ne suffit
-- pas (abonnement_actif reste true en base). Le faire explicitement :
-- ---------------------------------------------------------------------
-- update artisans set abonnement_actif = false
--   where user_id = (select id from auth.users where lower(email) = 'a-revoquer@exemple.fr');
