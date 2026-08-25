"use client";
import { useEffect } from "react";

// Bug connu de Safari iOS en mode "ajoute a l'ecran d'accueil" : au tout
// premier affichage, le moteur de mise en page interne de Safari n'a pas
// encore recalcule sa mise en page standalone (menu du bas qui flotte, avec
// un espace vide en dessous) -- seul un vrai geste de scroll force ce
// recalcul.
//
// On simule ce geste (1px puis retour) juste apres le chargement, a
// quelques reprises, UNE SEULE FOIS -- sans jamais installer d'ecouteur
// permanent (resize, visualViewport...). C'est cette reaction continue a
// des evenements qui revenaient sans cesse (notamment a l'ouverture du
// clavier) qui avait cause un bug bien pire dans une tentative precedente :
// l'ecran restait bloque en position remontee des qu'on remplissait un
// champ. Ici, une fois les quelques essais initiaux passes, plus rien ne
// s'execute.
export function CorrectionPremierChargementIOS() {
  useEffect(() => {
    function forcerRecalcul() {
      const conteneur = document.querySelector<HTMLElement>(".app-scroll");
      if (conteneur) {
        const y = conteneur.scrollTop;
        conteneur.scrollTop = y + 1;
        conteneur.scrollTop = y;
      }
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    }

    const delais = [50, 300, 800].map((ms) => setTimeout(forcerRecalcul, ms));
    return () => delais.forEach(clearTimeout);
  }, []);

  return null;
}
