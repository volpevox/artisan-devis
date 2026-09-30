"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_DOUBLE_TAP = 2;

function borner(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

function distance(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

// On dessine nous-memes le PDF (via pdf.js) plutot que de le confier au
// lecteur natif du telephone dans une iframe : impossible de controler le
// niveau de zoom initial de ce dernier de facon fiable (comportement
// different selon l'appareil, parfois meme le geste de zoom/deplacement ne
// fonctionne plus). Ici, chaque page est explicitement dessinee a la
// largeur exacte de l'ecran -- comportement garanti et identique partout.
//
// Zoom : le zoom de page est bloque dans toute l'appli (layout.tsx), on le
// gere donc ici, dans la seule zone du PDF : pincement, double-tap et
// boutons +/-. Pendant le pincement on agrandit en CSS (fluide), puis au
// lacher on redessine le PDF a la nouvelle taille (net) en gardant sous les
// doigts le point qui y etait.
export function VisionneusePdf({ url }: { url: string }) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const contenuRef = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(0);
  const [nombrePages, setNombrePages] = useState(0);
  const [erreur, setErreur] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  // Defilement a appliquer une fois le PDF redessine a la nouvelle taille.
  const defilementVise = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function mesurer() {
      if (zoneRef.current) setLargeur(zoneRef.current.clientWidth);
    }
    mesurer();
    window.addEventListener("resize", mesurer);
    return () => window.removeEventListener("resize", mesurer);
  }, []);

  const appliquerDefilement = useCallback(() => {
    const zone = zoneRef.current;
    const vise = defilementVise.current;
    if (!zone || !vise) return;
    zone.scrollLeft = vise.x;
    zone.scrollTop = vise.y;
  }, []);

  // Zoome en gardant fixe le point (px, py) de la zone visible.
  const zoomerVers = useCallback((nouveau: number, px: number, py: number) => {
    const zone = zoneRef.current;
    const ancien = zoomRef.current;
    const cible = borner(nouveau);
    if (!zone || cible === ancien) return;
    const f = cible / ancien;
    defilementVise.current = {
      x: (zone.scrollLeft + px) * f - px,
      y: (zone.scrollTop + py) * f - py,
    };
    zoomRef.current = cible;
    setZoom(cible);
  }, []);

  useEffect(() => {
    appliquerDefilement();
  }, [zoom, appliquerDefilement]);

  // Gestes tactiles : ecouteurs natifs (passive: false) pour pouvoir
  // empecher le navigateur de traiter le pincement lui-meme.
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    let pincement: { d0: number; px: number; py: number; ratio: number } | null = null;
    let dernierTap = 0;
    let tapBouge = false;

    function pointDansZone(x: number, y: number) {
      const r = zone!.getBoundingClientRect();
      return { px: x - r.left, py: y - r.top };
    }

    function debut(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const { px, py } = pointDansZone((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
        pincement = { d0: distance(a, b), px, py, ratio: 1 };
        const contenu = contenuRef.current;
        if (contenu) {
          contenu.style.transformOrigin = `${zone!.scrollLeft + px}px ${zone!.scrollTop + py}px`;
        }
      } else if (e.touches.length === 1) {
        tapBouge = false;
      }
    }

    function mouvement(e: TouchEvent) {
      if (pincement && e.touches.length === 2) {
        e.preventDefault();
        const brut = distance(e.touches[0], e.touches[1]) / pincement.d0;
        // Le ratio visuel reste dans les bornes du zoom final.
        pincement.ratio = borner(zoomRef.current * brut) / zoomRef.current;
        if (contenuRef.current) contenuRef.current.style.transform = `scale(${pincement.ratio})`;
      } else {
        tapBouge = true;
      }
    }

    function fin(e: TouchEvent) {
      if (pincement && e.touches.length < 2) {
        const { px, py, ratio } = pincement;
        pincement = null;
        if (contenuRef.current) contenuRef.current.style.transform = "";
        zoomerVers(zoomRef.current * ratio, px, py);
        dernierTap = 0;
        return;
      }
      // Double-tap : zoom sur le point touche, ou retour a la taille normale.
      if (e.touches.length === 0 && e.changedTouches.length === 1 && !tapBouge) {
        const maintenant = Date.now();
        if (maintenant - dernierTap < 300) {
          e.preventDefault();
          const t = e.changedTouches[0];
          const { px, py } = pointDansZone(t.clientX, t.clientY);
          zoomerVers(zoomRef.current > 1 ? 1 : ZOOM_DOUBLE_TAP, px, py);
          dernierTap = 0;
        } else {
          dernierTap = maintenant;
        }
      }
    }

    // Safari (iOS) : evenements de geste propres, a neutraliser aussi.
    function bloquerGeste(e: Event) {
      e.preventDefault();
    }

    zone.addEventListener("touchstart", debut, { passive: false });
    zone.addEventListener("touchmove", mouvement, { passive: false });
    zone.addEventListener("touchend", fin, { passive: false });
    zone.addEventListener("gesturestart", bloquerGeste, { passive: false });
    zone.addEventListener("gesturechange", bloquerGeste, { passive: false });
    return () => {
      zone.removeEventListener("touchstart", debut);
      zone.removeEventListener("touchmove", mouvement);
      zone.removeEventListener("touchend", fin);
      zone.removeEventListener("gesturestart", bloquerGeste);
      zone.removeEventListener("gesturechange", bloquerGeste);
    };
  }, [zoomerVers]);

  function zoomerBouton(facteur: number) {
    const zone = zoneRef.current;
    if (!zone) return;
    zoomerVers(zoomRef.current * facteur, zone.clientWidth / 2, zone.clientHeight / 2);
  }

  // Au-dela de 2x l'ecran, on plafonne la finesse du dessin : les tres
  // grandes images font planter Safari sur iPhone.
  const finesse = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, zoom > 1.5 ? 2 : 3) : 1;

  return (
    <div className="pdf-viewer-cadre">
      <div ref={zoneRef} className="pdf-viewer-zone">
        {erreur ? (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <p className="message">Impossible d'afficher l'aperçu.</p>
            <a className="btn-ghost" href={url}>
              Télécharger le PDF
            </a>
          </div>
        ) : (
          <div ref={contenuRef} className="pdf-viewer-contenu">
            <Document
              file={url}
              onLoadSuccess={({ numPages }) => setNombrePages(numPages)}
              onLoadError={() => setErreur(true)}
              loading={<p className="message" style={{ textAlign: "center", marginTop: 24 }}>Chargement du document...</p>}
            >
              {largeur > 0 &&
                Array.from({ length: nombrePages }, (_, i) => (
                  <Page
                    key={i}
                    pageNumber={i + 1}
                    width={largeur * zoom}
                    devicePixelRatio={finesse}
                    className="pdf-viewer-page"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onRenderSuccess={i === 0 ? appliquerDefilement : undefined}
                  />
                ))}
            </Document>
          </div>
        )}
      </div>

      {!erreur && nombrePages > 0 ? (
        <div className="pdf-viewer-zoom">
          <button type="button" onClick={() => zoomerBouton(1 / 1.5)} disabled={zoom <= ZOOM_MIN} aria-label="Dézoomer">
            −
          </button>
          <button type="button" onClick={() => zoomerBouton(1.5)} disabled={zoom >= ZOOM_MAX} aria-label="Zoomer">
            +
          </button>
        </div>
      ) : null}
    </div>
  );
}
