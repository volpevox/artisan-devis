"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { CarteDocument } from "@/components/CarteDocument";

export default function MesFactures() {
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [factures, setFactures] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!artisanId) return;

    async function charger() {
      const { data } = await supabase
        .from("devis")
        .select("*")
        .eq("est_facture", true)
        .order("facture_creee_le", { ascending: false });
      setFactures(data || []);
      setChargement(false);
    }
    charger();
  }, [artisanId]);

  async function envoyerFacture(id: string) {
    setEnCours(id);
    setMessages((m) => ({ ...m, [id]: "Envoi de la facture en cours..." }));

    const res = await fetch(`/api/facture/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const data = await res.json();

    setEnCours("");

    if (data.erreur) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + data.erreur }));
      return;
    }

    const factureEnvoyeeLe = new Date().toISOString();
    setFactures((liste) => liste.map((d) => (d.id === id ? { ...d, facture_envoyee_le: factureEnvoyeeLe } : d)));
    setMessages((m) => ({ ...m, [id]: "Facture envoyée au client !" }));
  }

  return (
    <main className="page-shell page-shell--large">
      <Topbar />

      <h1 className="page-title">Factures</h1>

      {(chargementSession || chargement) && <p className="message">Chargement...</p>}
      {!chargementSession && !chargement && factures.length === 0 && (
        <p className="message">Aucune facture pour l'instant.</p>
      )}

      {factures.map((d) => (
        <CarteDocument
          key={d.id}
          d={d}
          type="facture"
          enCours={enCours}
          message={messages[d.id]}
          onEnvoyerFacture={envoyerFacture}
        />
      ))}
    </main>
  );
}
