-- Colonnes necessaires pour l'abonnement Stripe et l'essai gratuit de 14 jours.
--
-- essai_expire_le est rempli automatiquement (14 jours a partir de la creation
-- du profil artisan) via la valeur par defaut ci-dessous, aucun changement de
-- code necessaire pour les profils crees a partir de maintenant.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans
  add column if not exists essai_expire_le timestamptz not null default (now() + interval '14 days'),
  add column if not exists abonnement_actif boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;
