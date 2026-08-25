"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

// Abonnement generique aux changements en temps reel (Supabase Realtime) sur
// les devis d'un artisan. Utilise pour rafraichir automatiquement une liste
// (devis, factures) ou un compteur des qu'un devis change en base, sans
// recharger la page. `surChangement` n'a pas besoin d'etre memoise par
// l'appelant : on garde toujours la derniere version via une ref, pour ne
// pas resouscrire a chaque rendu.
export function useDevisRealtime(artisanId: string | null, surChangement: () => void) {
  const callbackRef = useRef(surChangement);
  callbackRef.current = surChangement;

  useEffect(() => {
    if (!artisanId) return;

    const canal = supabase
      .channel(`devis-realtime-${artisanId}`)
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
