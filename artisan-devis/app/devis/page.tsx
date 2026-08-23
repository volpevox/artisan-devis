"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { CarteDocument } from "@/components/CarteDocument";

export default function MesDevis() {
  const { artisanId, loading: chargementSession } = useArtisanSession();
  const [devis, setDevis] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!artisanId) return;

    async function charger() {
      const { data } = await supabase
        .from("devis")
        .select("*")
        .eq("est_facture", false)
        .order("created_at", { ascending: false });
      setDevis(data || []);
      setChargement(false);
    }
    charger();
  }, [artisanId]);

  async function transformerEnFacture(id: string) {
    setEnCours(id);
    const factureCreeeLe = new Date().toISOString();

    const { data: numeroFacture, error: erreurNumero } = await supabase.rpc("numero_facture_suivant", {
      p_artisan_id: artisanId,
    });

    if (erreurNumero) {
      setEnCours("");
      setMessages((m) => ({ ...m, [id]: "Erreur de numérotation : " + erreurNumero.message }));
      return;
    }

    const { error } = await supabase
      .from("devis")
      .update({ est_facture: true, facture_creee_le: factureCreeeLe, numero_facture: numeroFacture })
      .eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    // Le devis facture n'a plus sa place sur cette page (filtree sur est_facture=false).
    setDevis((liste) => liste.filter((d) => d.id !== id));
    setMessages((m) => ({ ...m, [id]: "Devis transformé en facture ! Retrouve-le dans l'onglet Factures." }));
  }

  return (
    <main className="page-shell page-shell--large">
      <Topbar />

      <h1 className="page-title">Devis</h1>

      {(chargementSession || chargement) && <p className="message">Chargement...</p>}
      {!chargementSession && !chargement && devis.length === 0 && (
        <p className="message">Aucun devis enregistré pour l'instant.</p>
      )}

      {devis.map((d) => (
        <CarteDocument
          key={d.id}
          d={d}
          type="devis"
          enCours={enCours}
          message={messages[d.id]}
          onTransformerEnFacture={transformerEnFacture}
        />
      ))}
    </main>
  );
}
