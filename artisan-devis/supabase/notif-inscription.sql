-- Notification "nouvel inscrit" dans l'appli de Marley (lib/notifInscription.ts).
--
-- inscription_notifiee_le : date d'envoi de la notification pour ce compte.
-- Garantit "un inscrit = une notification", meme si l'inscription est
-- coupee en route (la notification est alors rattrapee a l'ouverture suivante).
--
-- Les comptes DEJA inscrits sont marques comme notifies tout de suite, pour
-- ne pas recevoir une notification pour chacun d'eux.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans add column if not exists inscription_notifiee_le timestamptz;

update artisans
   set inscription_notifiee_le = coalesce(created_at, now())
 where inscription_notifiee_le is null;
