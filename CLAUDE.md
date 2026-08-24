# Artisan Devis (VolpeVox)

## Le projet
SaaS ultra-simple pour artisans/prestataires en France : dictée orale d'un chantier → devis rempli automatiquement par IA → signature électronique du client → transformation en facture en 1 clic → paiement en ligne. Inspiré de QuoteIQ et Contractor+, mais volontairement épuré (pas de CRM, pas de planning d'équipe).

La vision complète du parcours (dictée → devis → signature → facture → paiement → relances) est aujourd'hui fonctionnelle de bout en bout. Le prix visé (79€/mois) est justifié par le temps récupéré (2-4h/jour selon Marley) plutôt que par une comparaison de fonctionnalités avec la concurrence — argument central à reprendre sur la future landing page.

## Stack technique
- Next.js 14 (App Router) + React + TypeScript
- Hébergement : Vercel
- Base de données : Supabase (région Europe/Frankfurt), RLS **désactivé** pour l'instant (à activer avant mise en prod avec de vrais artisans)
- Transcription vocale : OpenAI Whisper (`/api/transcrire`)
- IA de structuration du devis : OpenAI GPT-4o-mini (`/api/structurer`)
- Envoi d'emails : Resend, domaine `volpevox.fr` vérifié, envois depuis `devis@volpevox.fr` (`/api/envoyer`, `/api/facture/[id]`, `/api/upload-signature`, `/api/cron/relances`)
- Paiement abonnement (79€/mois, essai 14 jours) : Stripe Billing (`/api/creer-abonnement`)
- Paiement en ligne des factures pour les clients de l'artisan : Stripe Connect (comptes v2, direct charges, sans commission VolpeVox) (`/api/connecter-paiements`, `/api/payer-facture/[id]`)
- Génération PDF : `@react-pdf/renderer` (`lib/devisPdf.tsx`)
- Visionneuse PDF in-app : `react-pdf` v7 (pdfjs-dist v3 — **ne pas monter en v10/pdfjs-dist v5**, incompatible avec le webpack de Next.js 14, voir `next.config.js`)
- DNS : Cloudflare (migration terminée, propagation confirmée)
- Dépôt GitHub : volpevox/artisan-devis

## Schéma Supabase actuel (principales colonnes)
- `artisans` : id, user_id, nom_complet, nom_entreprise (facultatif), telephone, adresse, code_postal, ville, logo_url, taux_tva, siret, numero_tva, iban, conditions_paiement, essai_expire_le, abonnement_actif, stripe_account_id, stripe_paiement_actif
- `devis` : id, artisan_id, client_nom, client_email, client_adresse, date_prestation, statut (brouillon/envoye/signe), total, numero_devis, signature_url, signe_le, lieu_signature, signature_vue_le, est_facture, numero_facture, facture_creee_le, facture_envoyee_le, payee_le, moyen_paiement, relance_j3_envoyee_le, relance_j7_envoyee_le
- `lignes_devis` : id, devis_id, description, quantite, unite, prix_unitaire, total_ligne, ordre
- `prix_appris` : id, artisan_id, prestation, prix_moyen, nombre_utilisations, updated_at — utilisée : suggère un prix a partir des devis precedents de l'artisan
- Migrations ponctuelles en SQL brut dans `supabase/*.sql`, a executer manuellement par Marley dans le SQL Editor Supabase (pas de vraie migration versionnee)

## Déjà fait et testé (fonctionnel en production sur Vercel)
- Dictée vocale (Whisper) → structuration IA du devis (client, description, prix), avec suggestion de prix appris des devis precedents
- Génération PDF pro (logo, couleurs de marque) pour devis et factures
- Signature électronique tactile du client sur son téléphone (page publique `/signer/[id]`)
- Transformation devis → facture en un clic, avec numérotation automatique
- Envoi par email (devis, facture, notification de signature) depuis `devis@volpevox.fr`, ton chaleureux, reponses redirigees vers la boite mail de l'artisan
- Relances automatiques par email (devis non signés, factures impayées) via cron Vercel
- Abonnement Stripe (essai 14 jours puis 79€/mois), mode test fonctionnel
- Paiement en ligne des factures par les clients via Stripe Connect (comptes v2, sans commission), mode test fonctionnel
- Carnet de prix par apprentissage automatique (`prix_appris`)
- Page Profil complète : identité (nom/prénom obligatoire, nom d'entreprise facultatif), adresse complète (code postal obligatoire), infos légales (SIRET, taux de TVA en liste déroulante, IBAN facultatif), logo (upload + suppression), tuiles carrées Abonnement/Paiement en ligne
- Page Abonnement : prix et fonctionnalités toujours visibles, bouton support WhatsApp (pas de portail Stripe en libre-service, Marley préfère être contacté directement)
- Nom affiché sur les documents adapté au statut : taux de TVA à 0% → nom et prénom (+ entreprise si renseigné) ; taux > 0% → nom d'entreprise seul (probable société)
- Visionneuse PDF in-app (react-pdf/pdf.js) au lieu du lecteur natif du téléphone, pour garder l'en-tête et le bouton retour visibles
- Bouton "Partager" (devis/factures) via l'API de partage native du téléphone
- Redesign graphique : bouton de dictée (icône SVG, plus de pixelisation), cartes devis/factures (montant mis en avant, vrais boutons), écran de connexion (logo animé, centré)
- PWA : icône d'écran d'accueil correcte (iOS/Android), manifest, menu du bas dans un vrai cadre plein écran (`app-viewport`/`app-scroll`, plus de `position: fixed`)
- Domaine `volpevox.fr` sur Cloudflare, DNS Resend (DKIM/SPF/MX/DMARC) configurés

## Bugs connus, mis de côté (faible priorité)
- En mode "ajouté à l'écran d'accueil" sur iPhone, le menu du bas flotte au tout premier chargement et se recolle après un défilement manuel — plusieurs correctifs tentés sans succès total, mis de côté par Marley
- Le remplissage automatique des mots de passe (et Face ID associé) ne fonctionne pas en mode app iPhone, seulement dans Safari classique — limitation connue d'iOS, mise de côté

## Reste à faire (dans cet ordre convenu avec Marley)
1. **Pages légales de l'outil** — mentions légales, CGU, CGV, confidentialité/cookies. Prochaine session : rédiger une base standard, que Marley fera ensuite valider par une personne assermentée avant la mise en prod réelle. Placement prévu : section dédiée sur la page Profil + case à cocher à l'inscription.
2. **Phase de test complète** de l'outil par Marley (dictée, devis, facture, signature, paiement en ligne, abonnement) avant de le faire essayer à d'autres.
3. **Nouvel hébergement o2switch** pour la landing page (compte séparé de rema3302/agencevolpe.fr, "domaine plus tard" à la commande pour ne pas re-toucher aux DNS Cloudflare).
4. **Landing page WordPress** (volpevox.fr) — tout à la fin. Angle marketing central : "récupère tes soirées" (temps gagné), pas une liste de fonctionnalités — voir memoire `landing_page_positionnement_prix`.
5. **Stripe en mode réel** — quand Marley est prêt à facturer/encaisser pour de vrai : vérification d'identité de la plateforme + remplacement des clés test par les clés live dans Vercel.
6. **Petit ménage** — fichiers `node_modules/`, `package.json`, `package-lock.json` à la racine du dépôt (hors du dossier `artisan-devis/`), origine inconnue, à clarifier avec Marley avant suppression.
7. **Performance / fluidité** — minification, cache — en tout dernier, une fois toutes les fonctionnalités en place.

## Comment travailler avec moi (Marley, le fondateur)
- Je ne suis pas développeur. Explications simples, pas de jargon non expliqué.
- Avancer étape par étape, une seule chose à la fois, avec validation avant de passer à la suite.
- Avant de modifier du code, explique brièvement ce que ça va faire.
- Toujours tester en local (`npm run dev`) avant de pousser sur GitHub/Vercel. Pour tester une page qui nécessite d'être connecté sans avoir mes identifiants : commenter temporairement le `router.push("/connexion")` dans `lib/useArtisan.ts`, tester, puis remettre avant de pousser (jamais pousser avec le bypass actif).
- Windows, terminal PowerShell.
- Pour les bugs propres à iOS/Safari (mode "ajouté à l'écran d'accueil" notamment), je ne peux pas tester sur un vrai appareil : je corrige à l'aveugle et je le dis clairement plutôt que de prétendre être sûr du résultat.
