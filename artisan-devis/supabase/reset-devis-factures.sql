-- Remet a zero les devis/factures et le carnet de prix appris D'UN SEUL
-- artisan (celui dont l'email de connexion est indique ci-dessous), pour
-- repartir sur des tests propres SANS toucher aux autres comptes.
--
-- IMPORTANT : remplace 'TON_EMAIL_ICI' par l'email de connexion du compte
-- a reinitialiser avant de lancer ce script. Si l'email ne correspond a
-- aucun compte, le script s'arrete avec une erreur (rien n'est supprime).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

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

  delete from lignes_devis where devis_id in (select id from devis where artisan_id = v_artisan_id);
  delete from devis where artisan_id = v_artisan_id;
  delete from prix_appris where artisan_id = v_artisan_id;

  update artisans
  set prochain_numero_devis = 1, prochain_numero_facture = 1
  where id = v_artisan_id;
end $$;
