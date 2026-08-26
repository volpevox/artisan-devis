-- Donne un acces gratuit et permanent a une personne, sans passer par Stripe.
-- A utiliser pour offrir l'acces a une poignee de personnes choisies (amis,
-- beta-testeurs...).
--
-- Comment ca marche : l'acces a l'appli ne depend que du champ
-- artisans.abonnement_actif. Comme cette ligne n'aura pas de
-- stripe_subscription_id, le webhook Stripe (customer.subscription.updated/
-- deleted) ne peut jamais la desactiver automatiquement -- l'acces reste
-- gratuit tant que tu ne le changes pas toi-meme.
--
-- Marche a suivre pour chaque personne :
-- 1. Elle cree son compte sur la page d'inscription normale
--    (app.volpevox.fr/connexion?mode=inscription), sans carte demandee.
-- 2. Remplace l'email ci-dessous par le sien.
-- 3. Colle ce script dans Supabase -> Dashboard -> SQL Editor -> Run.
--    (fonctionne que la personne ait deja une ligne artisans ou non)

update artisans
set abonnement_actif = true
where user_id = (select id from auth.users where email = 'email-de-la-personne@exemple.com');

insert into artisans (user_id, abonnement_actif)
select id, true
from auth.users
where email = 'email-de-la-personne@exemple.com'
  and not exists (
    select 1 from artisans where artisans.user_id = auth.users.id
  );

-- Pour retirer l'acces gratuit plus tard, remplacer "true" par "false" dans
-- le premier UPDATE ci-dessus et l'executer seul (sans le INSERT).
