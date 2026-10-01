-- Suivi de l'utilisation de l'appli, pour le tableau de bord /admin.
--
-- Ajoute a la table artisans :
--   - derniere_ouverture_le : mise a jour a chaque ouverture de l'appli
--     (par /api/activer-invite, deja appelee a chaque ouverture)
--   - nb_dictees, premiere_dictee_le, derniere_dictee_le : comptees par
--     /api/transcrire a chaque dictee reussie
--   - provenance_* : d'ou vient l'inscrit (parametres utm_ du lien
--     d'arrivee, ou site d'origine), enregistree une seule fois a l'inscription
--
-- Ces colonnes ne sont remplies qu'a partir de la mise en ligne : les comptes
-- deja inscrits restent a "inconnu" pour la provenance et a 0 dictee.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans add column if not exists derniere_ouverture_le timestamptz;
alter table artisans add column if not exists nb_dictees integer not null default 0;
alter table artisans add column if not exists premiere_dictee_le timestamptz;
alter table artisans add column if not exists derniere_dictee_le timestamptz;
alter table artisans add column if not exists provenance_source text;
alter table artisans add column if not exists provenance_medium text;
alter table artisans add column if not exists provenance_campagne text;
alter table artisans add column if not exists provenance_referent text;

-- Compte une dictee en une seule operation (pas de lecture puis ecriture :
-- deux dictees rapprochees ne peuvent pas s'ecraser). Appelee uniquement par
-- le serveur (cle de service) ; la cle publique ne peut pas l'executer.
create or replace function compter_dictee(p_artisan_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update artisans
     set nb_dictees = coalesce(nb_dictees, 0) + 1,
         premiere_dictee_le = coalesce(premiere_dictee_le, now()),
         derniere_dictee_le = now()
   where id = p_artisan_id;
$$;

revoke execute on function compter_dictee(uuid) from public, anon, authenticated;
