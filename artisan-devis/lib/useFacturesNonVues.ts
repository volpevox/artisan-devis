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
    // On liste les ids au lieu d'un count "head: true" : cette requete-la
    // (HEAD + Prefer: count=exact) revient en 503 a travers la passerelle
    // Supabase quand elle est faite avec la session de l'artisan (verifie en
    // prod le 28/08/2026 ; la meme requete en GET passe). Les elements "non
    // vus" sont peu nombreux par nature, lister leurs ids est negligeable.
    const { data } = await supabase
      .from("devis")
      .select("id")
      .eq("artisan_id", artisanId)
      .eq("est_facture", true)
      .is("facture_vue_le", null);
    setCompte(data?.length || 0);
  }

  useEffect(() => {
    recompter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artisanId]);

  useDevisRealtime(artisanId, recompter);

  return compte;
}
