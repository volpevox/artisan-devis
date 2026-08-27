-- =====================================================================
-- Acces gratuit : mail de bienvenue automatique
-- =====================================================================
-- A executer UNE FOIS dans le SQL Editor de Supabase.
-- Ajoute 3 colonnes a la table acces_gratuit_emails :
--
--   prenom           texte    -> a remplir a la main, personnalise le mail
--                               ("Bonjour Julien,"). Vide = "Bonjour,".
--
--   envoyer_le_mail  case     -> DECOCHEE par defaut. Le mail ne part QUE
--                               pour les lignes ou tu coches cette case.
--
--   invite_le        date     -> rempli tout seul apres l'envoi. Empeche
--                               d'envoyer deux fois a la meme personne.
--
-- Le cron Vercel (tous les jours a 8h) regarde : lignes cochees + pas
-- encore envoyees -> il envoie le mail, coche invite_le.
--
-- POUR ENVOYER A QUELQU'UN : coche sa case "envoyer_le_mail" dans le
-- Table Editor Supabase. Rien d'autre a faire.
-- POUR TESTER : coche SEULEMENT ta propre ligne, attends le mail, verifie.
-- =====================================================================

alter table acces_gratuit_emails
  add column if not exists prenom          text,
  add column if not exists envoyer_le_mail boolean not null default false,
  add column if not exists invite_le       timestamptz;

-- Pour renvoyer le mail a quelqu'un plus tard : vider invite_le et recocher.
--   update acces_gratuit_emails
--     set invite_le = null, envoyer_le_mail = true
--     where email = 'quelquun@exemple.fr';
