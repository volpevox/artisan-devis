-- Efface l'identifiant de compte de paiement (Stripe Connect) enregistre
-- pour UN SEUL artisan (celui dont l'email de connexion est indique
-- ci-dessous), pour permettre une reconnexion propre.
--
-- A utiliser quand un compte de paiement a ete connecte pendant que l'app
-- etait encore en mode test Stripe : l'identifiant reste valable seulement
-- en mode test, et devient invalide une fois l'app passee en mode reel (cle
-- secrete live). Ce script ne supprime rien d'autre (devis, factures,
-- profil) -- seulement la connexion de paiement, a refaire ensuite via
-- Profil -> "Paiement en ligne" dans l'app.
--
-- IMPORTANT : remplace 'TON_EMAIL_ICI' par l'email de connexion du compte
-- concerne avant de lancer ce script. Si l'email ne correspond a aucun
-- compte, le script s'arrete avec une erreur (rien n'est modifie).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

-- Necessaire ici : un trigger (proteger-champs-abonnement.sql) bloque
-- normalement toute modification de stripe_account_id/stripe_paiement_actif
-- qui ne vient pas du serveur de l'app (cle de service) -- y compris une
-- commande lancee a la main ici. On le desactive juste le temps de cette
-- transaction (il se reactive automatiquement juste apres, sans y toucher).
begin;
set local session_replication_role = replica;

do $$
declare
  v_email text := 'TON_EMAIL_ICI';
  v_artisan_id uuid;
begin
  select a.id into v_artisan_id
  from artisans a
  join auth.users u on u.id = a.user_id
  where u.email = v_email;

  if v_artisan_id is null then
    raise exception 'Aucun compte artisan trouve pour l''email "%". Verifie l''adresse en haut du script avant de relancer.', v_email;
  end if;

  update artisans
  set stripe_account_id = null, stripe_paiement_actif = false
  where id = v_artisan_id;
end $$;

commit;
