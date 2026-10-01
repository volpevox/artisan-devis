// Provenance des inscrits (Meta, Google, TikTok, recommandation, direct...),
// affichee dans le tableau de bord /admin.
//
// A l'arrivee sur l'appli, on lit les parametres utm_ du lien (ex:
// ?utm_source=meta&utm_campaign=lancement), ou a defaut les identifiants de
// clic ajoutes automatiquement par les regies (fbclid, gclid, ttclid), ou le
// site d'origine. La landing volpevox.fr transmet les siens via vv_ref.
// On garde la PREMIERE provenance vue sur cet appareil (localStorage), puis
// on l'envoie a /api/activer-invite, qui l'enregistre une seule fois, a la
// creation du compte. Elle survit ainsi au detour par "Se connecter avec
// Google" (qui fait perdre les parametres du lien).
//
// Rien de personnel ici : juste le nom de la source et de la campagne, garde
// sur l'appareil et utilise uniquement pour nos propres statistiques.
const CLE = "volpevox-provenance";

export type Provenance = {
  source?: string;
  medium?: string;
  campagne?: string;
  referent?: string;
};

function couper(v: string | null | undefined) {
  const t = (v || "").trim();
  return t ? t.slice(0, 100) : undefined;
}

export function capturerProvenance() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(CLE)) return; // premiere provenance deja gardee

    const p = new URLSearchParams(window.location.search);
    let source = couper(p.get("utm_source"));
    if (!source && p.get("fbclid")) source = "meta";
    if (!source && (p.get("gclid") || p.get("gbraid") || p.get("wbraid"))) source = "google";
    if (!source && p.get("ttclid")) source = "tiktok";

    // Site d'origine : celui que la landing a transmis (vv_ref), sinon celui
    // du navigateur s'il est externe a l'appli.
    let referent = couper(p.get("vv_ref"));
    if (!referent && document.referrer) {
      try {
        const hote = new URL(document.referrer).hostname;
        if (hote && hote !== window.location.hostname) referent = hote;
      } catch {
        // referrer illisible : ignore
      }
    }

    const provenance: Provenance = {
      source,
      medium: couper(p.get("utm_medium")),
      campagne: couper(p.get("utm_campaign")),
      referent,
    };
    // Rien d'utile (ouverture directe, navigation interne) : on ne garde
    // rien, pour laisser sa chance a une vraie provenance plus tard.
    if (!provenance.source && !provenance.referent) return;
    localStorage.setItem(CLE, JSON.stringify(provenance));
  } catch {
    // stockage indisponible (navigation privee...) : provenance perdue, sans gravite
  }
}

export function lireProvenance(): Provenance | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CLE);
    return v ? (JSON.parse(v) as Provenance) : null;
  } catch {
    return null;
  }
}

// Classe une provenance brute dans une grande famille, pour l'affichage admin.
export function familleProvenance(source?: string | null, referent?: string | null) {
  const s = (source || "").toLowerCase();
  const r = (referent || "").toLowerCase();
  if (/(^|[^a-z])(meta|facebook|fb|instagram|ig)([^a-z]|$)/.test(s) || /facebook|instagram/.test(r)) return "Meta";
  if (/tiktok/.test(s) || /tiktok/.test(r)) return "TikTok";
  if (/google|adwords/.test(s) || /google\./.test(r)) return "Google";
  if (/recommandation/.test(s)) return "Recommandation";
  if (s) return source as string;
  if (/volpevox\.fr$/.test(r)) return "Site vitrine";
  if (r) return r;
  return "Inconnu";
}
