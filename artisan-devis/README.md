# VolpeVox — mise en route

## 1. Décompresser
Décompresse ce zip où tu veux sur ton ordinateur (par exemple dans "Documents").

## 2. Envoyer le dossier sur GitHub
Ouvre un terminal dans ce dossier, puis colle ces commandes une par une :

```
git init
git add .
git commit -m "Premier envoi du projet"
```

Ensuite, va sur github.com, crée un nouveau dépôt (bouton vert "New"), nomme-le `artisan-devis`, et laisse-le vide (ne coche aucune case). GitHub t'affichera ensuite des commandes du type :

```
git remote add origin https://github.com/TON-NOM/artisan-devis.git
git branch -M main
git push -u origin main
```

Copie-colle exactement ces lignes-là (GitHub te les donne avec ton propre nom d'utilisateur dedans).

## 3. Connecter Vercel
Sur vercel.com, clique sur "Add New Project", choisis le dépôt `artisan-devis` que tu viens de créer, et clique sur "Deploy".

## 4. Ajouter les clés secrètes
Toujours sur Vercel : Settings > Environment Variables, et ajoute les 4 clés qui sont dans `.env.example` (Supabase, OpenAI, Resend) avec leurs vraies valeurs.
