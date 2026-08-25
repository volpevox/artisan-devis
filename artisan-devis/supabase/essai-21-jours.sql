-- Passe la duree de l'essai gratuit de 14 a 21 jours pour les nouveaux
-- artisans. N'affecte pas les comptes existants (la vraie date d'essai est
-- de toute facon desormais fixee par le webhook Stripe a la souscription,
-- ce defaut ne sert que de valeur de depart avant tout passage par Stripe).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

alter table artisans
  alter column essai_expire_le set default (now() + interval '21 days');
