// Google Analytics 4 (GA4) — mesure d'audience, en preparation de Google Ads.
//
// Pilote par la variable d'environnement NEXT_PUBLIC_GA_ID :
//   - "G-XXXXXXXXXX" -> le tag GA4 est charge et les evenements sont envoyes.
//   - absente         -> rien n'est charge. C'est le cas en local (npm run dev)
//                        et sur les previews Vercel : nos tests ne polluent pas
//                        les statistiques.
//
// A definir dans Vercel sur l'environnement PRODUCTION uniquement.
// Meme principe que lib/modeGratuit.ts.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

type GtagParams = Record<string, unknown>;

// Envoie un evenement GA4, ex: trackEvent("sign_up", { method: "email" }).
// Sans effet si le tag n'est pas charge (GA_ID absent) ou cote serveur.
export function trackEvent(nom: string, params?: GtagParams) {
  if (!GA_ID || typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", nom, params ?? {});
}
