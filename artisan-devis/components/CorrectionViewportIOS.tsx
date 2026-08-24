"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Bug connu de Safari iOS en mode "ajoute a l'ecran d'accueil" : le menu du
// bas (position: fixed; bottom: 0) ne rejoint pas le vrai bord de l'ecran
// dans ce mode precis, meme avec padding-bottom: env(safe-area-inset-bottom)
// -- un espace vide (fond de page) reste visible sous le menu. Plutot que de
// deviner la valeur exacte qui manque, on mesure l'ecart reel entre le bas
// du menu et le bas de l'ecran, et on comble precisement ce qui manque.
// Le menu (rendu par Topbar) est remonte a chaque changement de page -- on
// reapplique donc la correction a chaque navigation, pas seulement au
// premier chargement.
export function CorrectionViewportIOS() {
  const pathname = usePathname();

  useEffect(() => {
    const modeAutonome = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!modeAutonome) return;

    function corrigerEspaceBas() {
      const menu = document.querySelector<HTMLElement>(".bottom-nav");
      if (!menu) return;

      menu.style.paddingBottom = "";
      const rect = menu.getBoundingClientRect();
      const ecartManquant = window.innerHeight - rect.bottom;

      if (ecartManquant > 0) {
        const stylesActuels = window.getComputedStyle(menu);
        const paddingBasActuel = parseFloat(stylesActuels.paddingBottom) || 0;
        menu.style.paddingBottom = `${paddingBasActuel + ecartManquant}px`;
      }
    }

    const delai = setTimeout(corrigerEspaceBas, 150);
    window.addEventListener("resize", corrigerEspaceBas);
    document.addEventListener("visibilitychange", corrigerEspaceBas);

    return () => {
      clearTimeout(delai);
      window.removeEventListener("resize", corrigerEspaceBas);
      document.removeEventListener("visibilitychange", corrigerEspaceBas);
    };
  }, [pathname]);

  return null;
}
