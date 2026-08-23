-- Active la Row Level Security (RLS) sur les tables de l'app.
--
-- Sans RLS, la cle publique (anon) peut techniquement lire/modifier
-- n'importe quelle ligne de ces tables si une requete mal filtree existe
-- quelque part (front-end ou route API) : la RLS ajoute un filet de securite
-- au niveau de la base elle-meme, quoi qu'il arrive cote code.
--
-- Regle generale : un artisan ne peut voir/modifier que SES propres donnees,
-- identifiees via artisans.user_id = auth.uid() (l'utilisateur Supabase
-- connecte). Les routes qui utilisent la cle de service (createAdminSupabase :
-- devis-public, devis-pdf, upload-signature) contournent la RLS par design,
-- car elles servent le client final qui n'a pas de compte -- rien ne change
-- pour ces routes.
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

-- ===== artisans =====
alter table artisans enable row level security;

create policy "Un artisan voit son propre profil"
  on artisans for select
  using (user_id = auth.uid());

create policy "Un artisan cree son propre profil"
  on artisans for insert
  with check (user_id = auth.uid());

create policy "Un artisan modifie son propre profil"
  on artisans for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ===== devis =====
alter table devis enable row level security;

create policy "Un artisan voit ses propres devis"
  on devis for select
  using (artisan_id in (select id from artisans where user_id = auth.uid()));

create policy "Un artisan cree ses propres devis"
  on devis for insert
  with check (artisan_id in (select id from artisans where user_id = auth.uid()));

create policy "Un artisan modifie ses propres devis"
  on devis for update
  using (artisan_id in (select id from artisans where user_id = auth.uid()))
  with check (artisan_id in (select id from artisans where user_id = auth.uid()));

-- ===== lignes_devis =====
alter table lignes_devis enable row level security;

create policy "Un artisan voit les lignes de ses devis"
  on lignes_devis for select
  using (
    devis_id in (
      select id from devis where artisan_id in (select id from artisans where user_id = auth.uid())
    )
  );

create policy "Un artisan ajoute des lignes a ses devis"
  on lignes_devis for insert
  with check (
    devis_id in (
      select id from devis where artisan_id in (select id from artisans where user_id = auth.uid())
    )
  );

create policy "Un artisan modifie les lignes de ses devis"
  on lignes_devis for update
  using (
    devis_id in (
      select id from devis where artisan_id in (select id from artisans where user_id = auth.uid())
    )
  )
  with check (
    devis_id in (
      select id from devis where artisan_id in (select id from artisans where user_id = auth.uid())
    )
  );

-- ===== prix_appris =====
alter table prix_appris enable row level security;

create policy "Un artisan voit ses propres prix appris"
  on prix_appris for select
  using (artisan_id in (select id from artisans where user_id = auth.uid()));

create policy "Un artisan enregistre ses propres prix appris"
  on prix_appris for insert
  with check (artisan_id in (select id from artisans where user_id = auth.uid()));

create policy "Un artisan modifie ses propres prix appris"
  on prix_appris for update
  using (artisan_id in (select id from artisans where user_id = auth.uid()))
  with check (artisan_id in (select id from artisans where user_id = auth.uid()));
