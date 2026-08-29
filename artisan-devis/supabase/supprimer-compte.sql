-- Supprime DEFINITIVEMENT le compte dont l'email de connexion est indique
-- ci-dessous : connexion (auth), profil artisan, devis, factures, lignes de
-- devis, carnet de prix appris, abonnements aux notifications push, et l'entree
-- dans la liste d'acces gratuit (acces_gratuit_emails) si elle existe.
--
-- IMPORTANT : remplace 'TON_EMAIL_ICI' par l'email de connexion du compte
-- a supprimer avant de lancer ce script. Si l'email ne correspond a aucun
-- compte auth, le script s'arrete avec une erreur (rien n'est supprime).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

do $$
declare
  v_email text := 'TON_EMAIL_ICI';
  v_user_id uuid;
  v_artisan_id uuid;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(v_email);

  if v_user_id is null then
    raise exception 'Aucun compte trouve pour l''email "%". Verifie l''adresse en haut du script avant de relancer.', v_email;
  end if;

  select a.id into v_artisan_id from artisans a where a.user_id = v_user_id;

  if v_artisan_id is not null then
    delete from lignes_devis where devis_id in (select id from devis where artisan_id = v_artisan_id);
    delete from devis where artisan_id = v_artisan_id;
    delete from prix_appris where artisan_id = v_artisan_id;
    delete from push_subscriptions where artisan_id = v_artisan_id;
    delete from artisans where id = v_artisan_id;
  end if;

  -- Retire l'email de la liste d'acces gratuit : sans ca, un re-enregistrement
  -- avec la meme adresse redonnerait l'acces automatiquement.
  delete from acces_gratuit_emails where lower(email) = lower(v_email);

  delete from auth.users where id = v_user_id;
end $$;
