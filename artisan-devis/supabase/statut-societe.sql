-- Artisan en societe (01/10/2026) : "Mon compte" demande "A ton nom / En
-- societe". En societe, le nom de l'entreprise passe en premier sur les
-- documents et deux mentions s'ajoutent au pied des PDF :
-- "SARL au capital de 5 000 €" (forme_capital) et "RCS Lyon" (rcs_ville).
-- est_societe vide (comptes existants) = ancienne regle (selon le taux de TVA).
alter table artisans add column if not exists est_societe boolean;
alter table artisans add column if not exists forme_capital text;
alter table artisans add column if not exists rcs_ville text;
