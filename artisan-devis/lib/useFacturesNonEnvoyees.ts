"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useDevisRealtime } from "@/lib/useDevisRealtime";

// Compte les factures creees mais pas encore envoyees au client. Se met a
// jour en temps reel (Supabase Realtime) : la pastille apparait des qu'un
// devis est transforme en facture, et disparait des que la facture est
// envoyee (l'artisan n'a pas besoin d'ouvrir la page pour la faire disparaitre,
// contrairement a la pastille "devis signes non vus").
export function useFacturesNonEnvoyees(artisanId: string | null) {
  const [compte, setCompte] = useState(0);

  useEffect(() => {
    if (!artisanId) {
      setCompte(0);
    }
  }, [artisanId]);

  async function recompter() {
    if (!artisanId) return;
    const { count } = await supabase
      .from("devis")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", artisanId)
      .eq("est_facture", true)
      .is("facture_envoyee_le", null);
    setCompte(count || 0);
  }

  useEffect(() => {
    recompter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artisanId]);

  useDevisRealtime(artisanId, recompter);

  return compte;
}
