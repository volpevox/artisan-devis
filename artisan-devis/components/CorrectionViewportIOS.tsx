"use client";
import { useEffect } from "react";

// Bug connu de Safari iOS en mode "ajoute a l'ecran d'accueil" : au tout
// premier affichage, la hauteur reelle de l'ecran (100dvh) est parfois mal
// calculee (trop haute), ce qui laisse le cadre de l'app -- et donc le menu
// du bas -- "flottant" au-dessus du vrai bord de l'ecran. Un defilement
// force Safari a recalculer correctement : on le declenche nous-memes au
// chargement, pour eviter a l'artisan de devoir le faire a la main.
export function CorrectionViewportIOS() {
  useEffect(() => {
    const modeAutonome = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!modeAutonome) return;

    function forcerRecalcul() {
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    }

    const delai = setTimeout(forcerRecalcul, 100);
    document.addEventListener("visibilitychange", forcerRecalcul);

    return () => {
      clearTimeout(delai);
      document.removeEventListener("visibilitychange", forcerRecalcul);
    };
  }, []);

  return null;
}
