"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useDevisRealtime } from "@/lib/useDevisRealtime";

// Compte les factures pas encore vues par l'artisan depuis leur creation
// (transformation d'un devis en facture). Se met a jour en temps reel
// (Supabase Realtime) et se remet a zero des que l'artisan ouvre l'onglet
// Factures, comme la pastille "devis signes non vus".
export function useFacturesNonVues(artisanId: string | null) {
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
      .is("facture_vue_le", null);
    setCompte(count || 0);
  }

  useEffect(() => {
    recompter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artisanId]);

  useDevisRealtime(artisanId, recompter);

  return compte;
}
