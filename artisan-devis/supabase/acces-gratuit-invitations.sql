-- =====================================================================
-- Acces gratuit : mail de bienvenue automatique
-- =====================================================================
-- Ajoute deux colonnes a acces_gratuit_emails :
--   prenom     : a remplir a la main dans le Table Editor Supabase, sert a
--                personnaliser le mail ("Bonjour Julien,"). Facultatif : si
--                vide, le mail commence par "Bonjour,".
--   invite_le  : rempli AUTOMATIQUEMENT par le cron quand le mail est parti.
--                Garantit qu'une personne ne recoit son mail qu'une seule fois.
--
-- Le cron quotidien /api/cron/relances (Vercel, tous les jours a 8h) envoie,
-- a chaque passage, un mail de bienvenue a toute ligne "actif = true" dont
-- "invite_le" est encore vide, puis note la date d'envoi.
-- =====================================================================


-- ============ ETAPE 1 : ajouter les colonnes (a jouer une fois) ========
alter table acces_gratuit_emails
  add column if not exists prenom    text,
  add column if not exists invite_le timestamptz;


-- ============ ETAPE 2 : METTRE TOUT LE MONDE "DEJA INVITE" =============
-- IMPORTANT avant le premier deploiement : sans ca, le prochain passage du
-- cron envoie le mail a TOUTES les personnes deja dans la table.
-- On "gele" tout le monde, on ne laissera repartir que le mail de test.
update acces_gratuit_emails set invite_le = now();


-- ============ ETAPE 3 : DEGELER UNIQUEMENT TON MAIL DE TEST ===========
-- Remplace l'adresse par celle que tu as ajoutee pour tester.
update acces_gratuit_emails set invite_le = null
  where email = 'MON-MAIL-DE-TEST@exemple.fr';

-- Deploie sur Vercel, puis declenche le cron (attendre 8h OU, depuis un
-- terminal, avec la valeur de CRON_SECRET lue dans Vercel) :
--   curl -H "Authorization: Bearer LE_CRON_SECRET" https://app.volpevox.fr/api/cron/relances
-- Seul le mail de test doit partir. Verifie le contenu + l'inscription.


-- ============ ETAPE 4 : QUAND TU ES PRET, ENVOYER AUX VRAIS ===========
-- Degele les personnes a qui tu veux VRAIMENT envoyer le mail maintenant.
-- Soit toutes celles jamais invitees pour de vrai :
--   update acces_gratuit_emails set invite_le = null
--     where email <> 'MON-MAIL-DE-TEST@exemple.fr';
-- Soit une par une :
--   update acces_gratuit_emails set invite_le = null where email = 'artisan1@exemple.fr';
-- Le prochain passage du cron (8h) leur enverra le mail.


-- ============ RENVOYER un mail a quelqu'un plus tard =================
--   update acces_gratuit_emails set invite_le = null where email = '...';
