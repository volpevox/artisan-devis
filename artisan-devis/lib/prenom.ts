// Devine le prenom a partir du champ "Prenom et nom" du profil, pour saluer
// l'artisan ("Bonjour Julien !"). Le champ s'appelait "Nom et prenom" au
// debut : certains ont pu taper "MOREAU Julien". Un mot tout en majuscules
// est alors pris pour le nom de famille et on garde l'autre ; sinon, le
// premier mot.
export function prenomDepuisNomComplet(nomComplet: string): string {
  const mots = nomComplet.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "";
  const enMajuscules = (m: string) => m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase();
  const prenom = mots.length > 1 && enMajuscules(mots[0]) ? mots.find((m) => !enMajuscules(m)) || mots[0] : mots[0];
  // "JULIEN" seul ou "julien" -> "Julien" (tirets gardes : "Jean-Marc").
  return prenom
    .toLowerCase()
    .split("-")
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join("-");
}

// Pour les comptes crees avant le champ "Prenom" separe : on decoupe le
// "Prenom et nom" enregistre en devinant le prenom (meme regle que
// ci-dessus). L'artisan corrige au besoin dans "Mon compte".
export function separerNomComplet(nomComplet: string, prenomConnu?: string | null): { prenom: string; nom: string } {
  const complet = nomComplet.trim();
  if (prenomConnu) {
    const reste = complet.toLowerCase().startsWith(prenomConnu.toLowerCase() + " ")
      ? complet.slice(prenomConnu.length).trim()
      : complet;
    return { prenom: prenomConnu, nom: reste };
  }
  const mots = complet.split(/\s+/).filter(Boolean);
  if (mots.length < 2) return { prenom: "", nom: complet };
  const enMajuscules = (m: string) => m.length > 1 && m === m.toUpperCase() && m !== m.toLowerCase();
  const indexPrenom = enMajuscules(mots[0]) ? Math.max(0, mots.findIndex((m) => !enMajuscules(m))) : 0;
  const prenom = mots[indexPrenom];
  return { prenom, nom: mots.filter((_, i) => i !== indexPrenom).join(" ") };
}
