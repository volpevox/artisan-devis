// Consentement aux traceurs (Google Analytics + pixel Meta), exige par la CNIL
// avant tout traceur de mesure d'audience ou publicitaire.
//
// Le choix est garde sur l'appareil (localStorage) : "oui", "non", ou rien
// (pas encore repondu -> le bandeau s'affiche). Tant que ce n'est pas "oui",
// aucun traceur n'est charge.
const CLE = "volpevox-cookies";
const EVENEMENT = "volpevox-consentement";

export type Consentement = "oui" | "non" | null;

export function lireConsentement(): Consentement {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CLE);
    return v === "oui" || v === "non" ? v : null;
  } catch {
    return null;
  }
}

// Enregistre le choix (ou l'efface avec null pour reposer la question, depuis
// la page confidentialite) et previent les composants qui l'ecoutent.
export function enregistrerConsentement(v: Consentement) {
  try {
    if (v) localStorage.setItem(CLE, v);
    else localStorage.removeItem(CLE);
  } catch {
    // stockage indisponible (navigation privee...) : le choix vaut pour la visite
  }
  window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: v }));
}

export function ecouterConsentement(rappel: (v: Consentement) => void) {
  const f = (e: Event) => rappel((e as CustomEvent<Consentement>).detail);
  window.addEventListener(EVENEMENT, f);
  return () => window.removeEventListener(EVENEMENT, f);
}
