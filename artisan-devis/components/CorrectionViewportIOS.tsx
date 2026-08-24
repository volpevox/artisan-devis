"use client";
import { useEffect } from "react";

// Bug connu de Safari iOS en mode "ajoute a l'ecran d'accueil" : au premier
// affichage, la zone reservee en bas de l'ecran (barre d'accueil) est mal
// calculee, laissant un espace vide sous les elements fixes en bas de page.
// Un defilement corrige immediatement l'affichage -- on le declenche donc
// nous-memes au chargement, uniquement dans ce mode, pour eviter a l'artisan
// de devoir le faire a la main.
export function CorrectionViewportIOS() {
  useEffect(() => {
    const modeAutonome = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!modeAutonome) return;

    const delai = setTimeout(() => {
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    }, 100);

    return () => clearTimeout(delai);
  }, []);

  return null;
}
