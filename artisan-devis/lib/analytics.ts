// Mesure d'audience et conversions publicitaires : Google Analytics 4 (GA4,
// relie a Google Ads) et pixel Meta (Facebook / Instagram Ads).
//
// Pilote par des variables d'environnement :
//   - NEXT_PUBLIC_GA_ID            "G-XXXXXXXXXX" -> tag GA4
//   - NEXT_PUBLIC_META_PIXEL_ID    "1234567890..." -> pixel Meta
//   - absentes -> rien n'est charge. C'est le cas en local (npm run dev) et
//     sur les previews Vercel : nos tests ne polluent pas les statistiques.
//
// A definir dans Vercel sur l'environnement PRODUCTION uniquement.
// Meme principe que lib/modeGratuit.ts.
//
// Dans tous les cas, rien n'est charge ni envoye tant que le visiteur n'a pas
// accepte les cookies (components/Traceurs.tsx, lib/consentement.ts).
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Params = Record<string, unknown>;

// Equivalent Meta des evenements GA4 qu'on envoie (evenements standards Meta).
const EVENEMENTS_META: Record<string, string> = {
  sign_up: "CompleteRegistration",
};

// Envoie un evenement, ex: trackEvent("sign_up", { method: "email" }).
// Part vers GA4 et, s'il a un equivalent, vers le pixel Meta.
// Sans effet si les traceurs ne sont pas charges (variables absentes,
// cookies refuses) ou cote serveur.
export function trackEvent(nom: string, params?: Params) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  };
  if (GA_ID && typeof w.gtag === "function") w.gtag("event", nom, params ?? {});
  const nomMeta = EVENEMENTS_META[nom];
  if (META_PIXEL_ID && nomMeta && typeof w.fbq === "function") w.fbq("track", nomMeta, params ?? {});
}
