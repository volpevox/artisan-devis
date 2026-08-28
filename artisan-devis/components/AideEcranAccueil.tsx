"use client";
import { useEffect, useState } from "react";

type Plateforme = "ios" | "android" | "autre";

function detecterPlateforme(): Plateforme {
  if (typeof navigator === "undefined") return "autre";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/android/i.test(ua)) return "android";
  return "autre";
}

// Vrai quand l'appli tourne deja en mode "ajoutee a l'ecran d'accueil"
// (standalone) -- iOS via navigator.standalone, le reste via display-mode.
export function estSurEcranAccueil(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

const BLOCS: Record<Plateforme, { titre: string; etapes: string[] }> = {
  ios: {
    titre: "Sur iPhone / iPad (Safari)",
    etapes: [
      "Appuie sur le bouton Partager (le carré avec une flèche vers le haut).",
      "Fais défiler la liste et choisis « Sur l'écran d'accueil ».",
      "Appuie sur « Ajouter » en haut à droite.",
    ],
  },
  android: {
    titre: "Sur Android (Chrome)",
    etapes: [
      "Ouvre le menu du navigateur (les trois points en haut à droite).",
      "Choisis « Ajouter à l'écran d'accueil » ou « Installer l'application ».",
      "Confirme.",
    ],
  },
  autre: {
    titre: "Sur ordinateur (Chrome / Edge)",
    etapes: [
      "Clique sur l'icône d'installation à droite de la barre d'adresse.",
      "Ou : menu du navigateur (les trois points) → « Installer VolpeVox ».",
    ],
  },
};

export function AideEcranAccueil() {
  const [plateforme, setPlateforme] = useState<Plateforme>("autre");

  useEffect(() => {
    setPlateforme(detecterPlateforme());
  }, []);

  const bloc = BLOCS[plateforme];

  return (
    <div>
      <p style={{ margin: "0 0 16px", fontSize: 13.5, lineHeight: 1.5, color: "var(--muted)" }}>
        Ajoute VolpeVox à ton écran d'accueil pour l'ouvrir en un geste, en plein écran, comme une vraie application.
      </p>

      <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{bloc.titre}</p>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.6, color: "var(--muted)" }}>
        {bloc.etapes.map((e, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {e}
          </li>
        ))}
      </ol>

      {plateforme !== "autre" && (
        <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
          Sur un autre appareil : cherche « Ajouter à l'écran d'accueil » ou « Installer l'application » dans le menu de
          ton navigateur.
        </p>
      )}
    </div>
  );
}
