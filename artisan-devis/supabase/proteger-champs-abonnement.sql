-- Empeche un artisan de s'auto-attribuer un abonnement ou un compte de
-- paiement actif en modifiant directement sa propre ligne "artisans" via
-- l'API Supabase (cle publique + sa propre session), en contournant Stripe.
--
-- Pourquoi : les policies RLS existantes (rls-policies.sql) autorisent un
-- artisan connecte a modifier n'importe quelle colonne de SA PROPRE ligne
-- (elles ne verifient que "user_id = auth.uid()", pas les colonnes) --
-- volontaire pour les champs de profil (nom, adresse...), mais dangereux
-- pour les champs lies a l'abonnement/au paiement : n'importe quel artisan
-- un peu technique pourrait sinon se donner lui-meme acces gratuitement,
-- ou se pretendre raccorde a un compte de paiement, en appelant l'API
-- Supabase directement (hors de l'appli). Ces champs ne doivent etre
-- modifies QUE par le serveur (webhook Stripe, /api/activer-invite,
-- /api/connecter-paiements, /api/statut-paiements) -- ces routes utilisent
-- deja toutes la cle de service (SUPABASE_SERVICE_ROLE_KEY), jamais la
-- session de l'artisan : ce correctif ne change donc rien a leur
-- fonctionnement, il bloque uniquement les acces qui n'auraient jamais du
-- exister.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

create or replace function proteger_champs_abonnement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.role() vaut 'service_role' uniquement pour les appels faits avec
  -- la cle de service (nos routes API serveur) -- jamais pour un artisan
  -- connecte via la cle publique, meme avec sa propre session valide.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.abonnement_actif := false;
    new.stripe_paiement_actif := false;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.stripe_account_id := null;
  else
    new.abonnement_actif := old.abonnement_actif;
    new.stripe_paiement_actif := old.stripe_paiement_actif;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.stripe_account_id := old.stripe_account_id;
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_champs_abonnement_trigger on artisans;

create trigger proteger_champs_abonnement_trigger
  before insert or update on artisans
  for each row
  execute function proteger_champs_abonnement();
