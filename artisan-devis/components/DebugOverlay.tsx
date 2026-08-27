"use client";
import { useEffect, useState } from "react";

// Panneau de diagnostic temporaire pour le bug "menu du bas non colle" en
// mode standalone iOS -- affiche les vraies valeurs mesurees par le
// navigateur (hauteur d'ecran, zone de securite, position reelle du menu),
// au lieu de deviner a partir de captures d'ecran. Invisible pour tout le
// monde sauf avec ?debug=1 dans l'URL -- aucun risque pour les vrais
// utilisateurs de l'app.
export function DebugOverlay() {
  const [actif, setActif] = useState(false);
  const [infos, setInfos] = useState<string[]>([]);

  useEffect(() => {
    // L'icone de l'ecran d'accueil s'ouvre toujours sur la meme adresse fixe
    // (sans parametre d'URL) : on memorise l'activation dans localStorage
    // pour qu'elle reste active aux lancements suivants depuis l'icone,
    // apres une premiere visite via Safari avec ?debug=1 dans l'adresse.
    if (window.location.search.includes("debug=1")) {
      localStorage.setItem("debugOverlay", "1");
    } else if (window.location.search.includes("debug=0")) {
      localStorage.removeItem("debugOverlay");
    }

    if (!localStorage.getItem("debugOverlay")) return;
    setActif(true);

    function mesurer() {
      const lignes: string[] = [];

      lignes.push(`window.innerHeight: ${window.innerHeight}px`);
      lignes.push(`window.innerWidth: ${window.innerWidth}px`);
      lignes.push(`visualViewport.height: ${window.visualViewport?.height ?? "n/a"}px`);
      lignes.push(`document.documentElement.clientHeight: ${document.documentElement.clientHeight}px`);
      lignes.push(`devicePixelRatio: ${window.devicePixelRatio}`);
      lignes.push(`display-mode standalone: ${window.matchMedia("(display-mode: standalone)").matches}`);

      const testeurSafeArea = document.createElement("div");
      testeurSafeArea.style.paddingBottom = "env(safe-area-inset-bottom)";
      testeurSafeArea.style.paddingTop = "env(safe-area-inset-top)";
      testeurSafeArea.style.position = "absolute";
      testeurSafeArea.style.visibility = "hidden";
      document.body.appendChild(testeurSafeArea);
      const stylesSafeArea = getComputedStyle(testeurSafeArea);
      lignes.push(`env(safe-area-inset-bottom): ${stylesSafeArea.paddingBottom}`);
      lignes.push(`env(safe-area-inset-top): ${stylesSafeArea.paddingTop}`);
      document.body.removeChild(testeurSafeArea);

      const appViewport = document.querySelector(".app-viewport");
      if (appViewport) {
        const rect = appViewport.getBoundingClientRect();
        const styles = getComputedStyle(appViewport);
        lignes.push(`--- .app-viewport ---`);
        lignes.push(`rect: top=${rect.top.toFixed(1)} bottom=${rect.bottom.toFixed(1)} height=${rect.height.toFixed(1)}`);
        lignes.push(`computed height: ${styles.height}`);
      } else {
        lignes.push(`.app-viewport : introuvable`);
      }

      const bottomNav = document.querySelector(".bottom-nav");
      if (bottomNav) {
        const rect = bottomNav.getBoundingClientRect();
        const styles = getComputedStyle(bottomNav);
        lignes.push(`--- .bottom-nav ---`);
        lignes.push(`rect: top=${rect.top.toFixed(1)} bottom=${rect.bottom.toFixed(1)} height=${rect.height.toFixed(1)}`);
        lignes.push(`computed height: ${styles.height}`);
        lignes.push(`computed padding: ${styles.padding}`);
        lignes.push(`ecart bas-ecran <-> bas-menu: ${(window.innerHeight - rect.bottom).toFixed(1)}px`);
      } else {
        lignes.push(`.bottom-nav : introuvable (page sans menu ?)`);
      }

      setInfos(lignes);
    }

    mesurer();
    const intervalle = setInterval(mesurer, 500);
    window.addEventListener("resize", mesurer);
    window.visualViewport?.addEventListener("resize", mesurer);

    return () => {
      clearInterval(intervalle);
      window.removeEventListener("resize", mesurer);
      window.visualViewport?.removeEventListener("resize", mesurer);
    };
  }, []);

  if (!actif) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: "rgba(0,0,0,0.85)",
        color: "#0f0",
        fontFamily: "monospace",
        fontSize: 10,
        lineHeight: 1.4,
        padding: "6px 8px",
        maxHeight: "45vh",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        pointerEvents: "none",
      }}
    >
      {infos.join("\n")}
    </div>
  );
}
