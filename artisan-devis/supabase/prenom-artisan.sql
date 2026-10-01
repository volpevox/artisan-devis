-- Prenom de l'artisan enregistre a part (01/10/2026) : "Mon compte" affiche
-- deux champs Prenom / Nom, et l'appli dit "Bonjour <prenom>".
-- nom_complet reste rempli ("Prenom Nom") pour les devis et factures.
alter table artisans add column if not exists prenom text;
