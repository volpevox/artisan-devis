-- Moyens de paiement acceptes par l'artisan (cases du profil, rubrique
-- Paiement) + BIC et titulaire du compte pour le virement.
-- moyens_paiement vide (comptes existants) = virement, cheque et especes,
-- comme avant.
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> Run,
-- AVANT de mettre en ligne le code qui l'utilise.

alter table artisans add column if not exists moyens_paiement text[];
alter table artisans add column if not exists bic text;
alter table artisans add column if not exists titulaire_compte text;
