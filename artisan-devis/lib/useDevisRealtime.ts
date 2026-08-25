"use client";
import { useEffect, useId, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

// Abonnement generique aux changements en temps reel (Supabase Realtime) sur
// les devis d'un artisan. Utilise pour rafraichir automatiquement une liste
// (devis, factures) ou un compteur des qu'un devis change en base, sans
// recharger la page. `surChangement` n'a pas besoin d'etre memoise par
// l'appelant : on garde toujours la derniere version via une ref, pour ne
// pas resouscrire a chaque rendu.
//
// Plusieurs composants sont montes en meme temps (menu du haut, menu du bas,
// page courante) et s'abonnent chacun independamment au meme artisan. Avec un
// nom de canal identique pour tous, Supabase ne livre les evenements qu'a un
// seul des abonnements, et les autres restent figes jusqu'au rechargement
// complet de l'appli -- d'ou useId() pour garantir un canal distinct par
// instance de composant, sans que chaque appelant ait a y penser.
export function useDevisRealtime(artisanId: string | null, surChangement: () => void) {
  const callbackRef = useRef(surChangement);
  callbackRef.current = surChangement;
  const idInstance = useId();

  useEffect(() => {
    if (!artisanId) return;

    const canal = supabase
      .channel(`devis-realtime-${artisanId}-${idInstance}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devis", filter: `artisan_id=eq.${artisanId}` },
        () => callbackRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [artisanId]);
}
