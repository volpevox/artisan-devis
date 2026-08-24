"use client";
import { useEffect } from "react";

// Bug connu de Safari iOS en mode "ajoute a l'ecran d'accueil" : au tout
// premier affichage, la valeur CSS 100dvh est parfois plus grande que la
// vraie hauteur d'ecran, ce qui laisse le cadre de l'app -- et donc le menu
// du bas -- "flottant" au-dessus du vrai bord. Plutot que d'esperer que
// Safari se corrige tout seul (ce qui n'a pas suffi), on mesure directement
// la vraie hauteur via window.innerHeight -- fiable, contrairement a dvh
// sur certaines versions d'iOS -- et on l'applique nous-memes.
export function CorrectionViewportIOS() {
  useEffect(() => {
    function definirHauteurReelle() {
      document.documentElement.style.setProperty("--hauteur-app", `${window.innerHeight}px`);
    }

    definirHauteurReelle();
    window.addEventListener("resize", definirHauteurReelle);
    window.addEventListener("orientationchange", definirHauteurReelle);

    return () => {
      window.removeEventListener("resize", definirHauteurReelle);
      window.removeEventListener("orientationchange", definirHauteurReelle);
    };
  }, []);

  return null;
}
