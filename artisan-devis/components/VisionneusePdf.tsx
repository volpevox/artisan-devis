"use client";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// On dessine nous-memes le PDF (via pdf.js) plutot que de le confier au
// lecteur natif du telephone dans une iframe : impossible de controler le
// niveau de zoom initial de ce dernier de facon fiable (comportement
// different selon l'appareil, parfois meme le geste de zoom/deplacement ne
// fonctionne plus). Ici, chaque page est explicitement dessinee a la
// largeur exacte de l'ecran -- comportement garanti et identique partout.
export function VisionneusePdf({ url }: { url: string }) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(0);
  const [nombrePages, setNombrePages] = useState(0);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    function mesurer() {
      if (conteneurRef.current) setLargeur(conteneurRef.current.clientWidth);
    }
    mesurer();
    window.addEventListener("resize", mesurer);
    return () => window.removeEventListener("resize", mesurer);
  }, []);

  return (
    <div ref={conteneurRef} className="pdf-viewer-zone">
      {erreur ? (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <p className="message">Impossible d'afficher l'aperçu.</p>
          <a className="btn-ghost" href={url}>
            Télécharger le PDF
          </a>
        </div>
      ) : (
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNombrePages(numPages)}
          onLoadError={() => setErreur(true)}
          loading={<p className="message" style={{ textAlign: "center", marginTop: 24 }}>Chargement du document...</p>}
        >
          {largeur > 0 &&
            Array.from({ length: nombrePages }, (_, i) => (
              <Page key={i} pageNumber={i + 1} width={largeur} className="pdf-viewer-page" />
            ))}
        </Document>
      )}
    </div>
  );
}
