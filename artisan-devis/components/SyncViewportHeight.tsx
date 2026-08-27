"use client";
import { useEffect } from "react";

// Tentative du 27/08/2026 pour le bug du menu du bas qui flotte au premier
// chargement en PWA iOS standalone (voir app/globals.css, .app-viewport).
// document.documentElement.clientHeight reste fiable meme quand dvh/
// innerHeight/visualViewport.height sont temporairement faux -- on l'utilise
// pour piloter --app-height, et on force la page a rester en haut (scrollTo)
// plutot que de laisser un rebond elastique la deplacer visuellement.
export function SyncViewportHeight() {
  useEffect(() => {
    function sync() {
      const height = document.documentElement.clientHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
      window.scrollTo(0, 0);
    }

    function onVisibilityChange() {
      if (!document.hidden) sync();
    }

    sync();
    const frame1 = requestAnimationFrame(sync);
    const frame2 = requestAnimationFrame(() => requestAnimationFrame(sync));

    window.addEventListener("pageshow", sync);
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
