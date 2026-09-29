-- Avoirs : annuler une facture deja envoyee (au lieu de la supprimer).
--
-- Une facture envoyee ne doit plus disparaitre (pas de "trou" dans la
-- numerotation, et des 2027 elle sera deja transmise au fisc). On l'annule
-- par un AVOIR : une facture en negatif, avec sa propre numerotation
-- (AV-1, AV-2...), independante par artisan.
--
-- L'avoir est stocke sur la ligne de la facture qu'il annule (un avoir =
-- annulation totale d'une facture) : pas de nouvelle ligne, donc les listes,
-- relances et paiements existants ne le prennent pas pour une facture.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

-- ===== 1. Compteur d'avoirs sur artisans =====
alter table artisans
  add column if not exists prochain_numero_avoir integer not null default 1;

-- ===== 2. Avoir sur la facture annulee =====
alter table devis
  add column if not exists avoir_numero integer,
  add column if not exists avoir_cree_le timestamptz;

-- ===== 3. Fonction "prochain numero d'avoir" (increment atomique) =====
-- Meme principe que numero_facture_suivant (supabase/numerotation.sql).
create or replace function numero_avoir_suivant(p_artisan_id uuid)
returns integer
language sql
set search_path = public
as $$
  update artisans
  set prochain_numero_avoir = prochain_numero_avoir + 1
  where id = p_artisan_id
  returning prochain_numero_avoir - 1;
$$;

grant execute on function numero_avoir_suivant(uuid) to authenticated;
