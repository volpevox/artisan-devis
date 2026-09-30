"use client";
import { createPortal } from "react-dom";

// Video tuto « VolpeVox en une minute » (fichier dans public/). Proposee sur
// l'ecran de bienvenue et dans Parametres, jamais imposee : elle ne s'ouvre
// que si l'artisan appuie sur le bouton.
export const VIDEO_TUTO_URL = "/tuto.mp4";

// Lecteur plein ecran, rendu dans <body> (meme raison que les popups : rester
// au-dessus du menu du bas sur iPhone).
export function LecteurVideoTuto({ onFermer }: { onFermer: () => void }) {
  return createPortal(
    <div className="video-tuto-fond" onClick={onFermer}>
      <video
        className="video-tuto-lecteur"
        src={VIDEO_TUTO_URL}
        poster="/tuto-apercu.jpg"
        controls
        autoPlay
        playsInline
        onClick={(e) => e.stopPropagation()}
      />
      <button type="button" className="btn btn-primary video-tuto-fermer" onClick={onFermer}>
        Fermer
      </button>
    </div>,
    document.body
  );
}
