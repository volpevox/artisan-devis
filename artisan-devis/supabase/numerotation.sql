-- Numerotation sequentielle des devis et factures, independante par artisan.
--
-- Chaque artisan a son propre compteur ("Devis n°1, n°2..." et "Facture n°1,
-- n°2..." recommencent a 1 pour chaque nouvel artisan). Les devis/factures
-- deja existants sont numerotes dans l'ordre chronologique pour ne rien
-- casser, puis le compteur de chaque artisan repart juste apres.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

-- ===== 1. Compteurs sur artisans =====
alter table artisans
  add column if not exists prochain_numero_devis integer not null default 1,
  add column if not exists prochain_numero_facture integer not null default 1;

-- ===== 2. Colonnes de numero sur devis =====
alter table devis
  add column if not exists numero_devis integer,
  add column if not exists numero_facture integer;

-- ===== 3. Numerote les devis existants (ordre chronologique, par artisan) =====
with classement as (
  select id, row_number() over (partition by artisan_id order by created_at asc) as rn
  from devis
)
update devis d
set numero_devis = c.rn
from classement c
where d.id = c.id and d.numero_devis is null;

-- ===== 4. Numerote les factures existantes (ordre chronologique, par artisan) =====
with classement_facture as (
  select id, row_number() over (partition by artisan_id order by coalesce(facture_creee_le, created_at) asc) as rn
  from devis
  where est_facture = true
)
update devis d
set numero_facture = c.rn
from classement_facture c
where d.id = c.id and d.numero_facture is null;

-- ===== 5. Fait repartir le compteur de chaque artisan juste apres le dernier numero attribue =====
update artisans a
set prochain_numero_devis = coalesce((select max(numero_devis) + 1 from devis where artisan_id = a.id), 1);

update artisans a
set prochain_numero_facture = coalesce((select max(numero_facture) + 1 from devis where artisan_id = a.id), 1);

-- ===== 6. Fonctions "prochain numero" (increment atomique) =====
-- Ces fonctions modifient la ligne artisans de l'appelant : la policy RLS
-- "Un artisan modifie son propre profil" s'applique, donc un artisan ne peut
-- jamais obtenir/faire avancer le compteur d'un autre.
create or replace function numero_devis_suivant(p_artisan_id uuid)
returns integer
language sql
as $$
  update artisans
  set prochain_numero_devis = prochain_numero_devis + 1
  where id = p_artisan_id
  returning prochain_numero_devis - 1;
$$;

create or replace function numero_facture_suivant(p_artisan_id uuid)
returns integer
language sql
as $$
  update artisans
  set prochain_numero_facture = prochain_numero_facture + 1
  where id = p_artisan_id
  returning prochain_numero_facture - 1;
$$;

grant execute on function numero_devis_suivant(uuid) to authenticated;
grant execute on function numero_facture_suivant(uuid) to authenticated;
