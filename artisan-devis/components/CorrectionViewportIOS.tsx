"use client";
import { useEffect } from "react";

// Bug connu de Safari iOS en mode "ajoute a l'ecran d'accueil" : au tout
// premier affichage, la hauteur d'ecran utilisable (dvh, window.innerHeight)
// est parfois erronee, et une seule mesure au chargement peut elle-meme
// tomber sur la mauvaise valeur. On surveille donc en continu la vraie
// taille visible de l'ecran via window.visualViewport (l'API la plus fiable
// pour ce cas precis) et on la reapplique a chaque changement, quel que
// soit ce qui declenche la correction chez Safari (rotation, defilement,
// retour au premier plan...).
export function CorrectionViewportIOS() {
  useEffect(() => {
    const vv = window.visualViewport;

    function definirHauteurReelle() {
      const hauteur = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--hauteur-app", `${hauteur}px`);
    }

    definirHauteurReelle();

    vv?.addEventListener("resize", definirHauteurReelle);
    window.addEventListener("resize", definirHauteurReelle);
    window.addEventListener("orientationchange", definirHauteurReelle);
    window.addEventListener("scroll", definirHauteurReelle, { passive: true });
    document.addEventListener("visibilitychange", definirHauteurReelle);

    return () => {
      vv?.removeEventListener("resize", definirHauteurReelle);
      window.removeEventListener("resize", definirHauteurReelle);
      window.removeEventListener("orientationchange", definirHauteurReelle);
      window.removeEventListener("scroll", definirHauteurReelle);
      document.removeEventListener("visibilitychange", definirHauteurReelle);
    };
  }, []);

  return null;
}
