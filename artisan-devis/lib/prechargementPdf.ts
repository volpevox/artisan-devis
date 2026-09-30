// Demarre le telechargement d'un PDF le plus tot possible (des que le doigt
// touche « Voir le devis », avant meme le changement de page), puis le
// remet a la visionneuse quand elle est prete -- au lieu d'attendre qu'elle
// soit chargee pour commencer a le demander au serveur.
//
// Le PDF change avec le statut (signature, paiement...) : une copie n'est
// gardee que quelques secondes, le temps d'ouvrir la visionneuse.

const DUREE_VIE_MS = 20_000;
const enCours = new Map<string, { promesse: Promise<ArrayBuffer>; le: number }>();

export function chargerPdf(url: string): Promise<ArrayBuffer> {
  const existant = enCours.get(url);
  if (existant && Date.now() - existant.le < DUREE_VIE_MS) return existant.promesse;

  const promesse = fetch(url, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error(`PDF indisponible (${res.status})`);
    return res.arrayBuffer();
  });
  // En cas d'echec, on ne garde pas la promesse : un nouvel essai refera la demande.
  promesse.catch(() => enCours.delete(url));
  enCours.set(url, { promesse, le: Date.now() });
  return promesse;
}

// La visionneuse a recupere son PDF : on libere la copie.
export function oublierPdf(url: string) {
  enCours.delete(url);
}

// Adresse de l'API qui fabrique le PDF, a partir du lien de la visionneuse
// (/devis-pdf/ID[?avoir=1] -> /api/devis-pdf/ID[?avoir=1]).
export function urlApiPdf(lienVisionneuse: string) {
  return `/api${lienVisionneuse}`;
}

// Charge a l'avance le code de la visionneuse (react-pdf) et le moteur
// pdf.js, pendant que l'artisan regarde sa liste de devis / factures.
let dejaPrepare = false;
export function preparerVisionneuse() {
  if (dejaPrepare || typeof window === "undefined") return;
  dejaPrepare = true;
  const lancer = () => {
    import("@/components/VisionneusePdf").catch(() => {
      dejaPrepare = false;
    });
    const lien = document.createElement("link");
    lien.rel = "prefetch";
    lien.href = "/pdf.worker.min.js";
    document.head.appendChild(lien);
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(lancer);
  else setTimeout(lancer, 1500);
}
