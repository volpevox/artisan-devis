"use client";
import { useEffect } from "react";

// Bug connu de Safari iOS en mode "ajoute a l'ecran d'accueil" : au premier
// affichage, la zone reservee en bas de l'ecran (barre d'accueil) est mal
// calculee pour les elements fixes (comme le menu du bas), laissant un
// espace vide sous eux. Un vrai defilement corrige l'affichage, mais un
// simple scrollTo() ne suffit pas quand la page tient deja entierement a
// l'ecran (rien a faire defiler) -- on force donc un recalcul de la mise
// en page en modifiant brievement la hauteur du document, ce qui produit
// le meme effet sans dependre d'un contenu scrollable.
export function CorrectionViewportIOS() {
  useEffect(() => {
    const modeAutonome = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!modeAutonome) return;

    function forcerRecalculMiseEnPage() {
      document.documentElement.style.height = "calc(100% + 1px)";
      requestAnimationFrame(() => {
        document.documentElement.style.height = "";
      });
    }

    const delai = setTimeout(forcerRecalculMiseEnPage, 150);
    document.addEventListener("visibilitychange", forcerRecalculMiseEnPage);

    return () => {
      clearTimeout(delai);
      document.removeEventListener("visibilitychange", forcerRecalculMiseEnPage);
    };
  }, []);

  return null;
}
