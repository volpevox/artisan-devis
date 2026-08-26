"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { useDevisRealtime } from "@/lib/useDevisRealtime";
import { CarteDocument } from "@/components/CarteDocument";

export default function MesDevis() {
  const { artisanId, loading: chargementSession } = useArtisanSession();
  const [devis, setDevis] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function charger() {
    const { data } = await supabase
      .from("devis")
      .select("*")
      .eq("est_facture", false)
      .order("created_at", { ascending: false });
    setDevis(data || []);
    setChargement(false);

    // Marque les devis signes comme vus, pour faire disparaitre la
    // pastille de notification dans l'en-tete.
    const idsNonVus = (data || []).filter((d) => d.statut === "signe" && !d.signature_vue_le).map((d) => d.id);
    if (idsNonVus.length > 0) {
      await supabase.from("devis").update({ signature_vue_le: new Date().toISOString() }).in("id", idsNonVus);
    }
  }

  useEffect(() => {
    if (!artisanId) return;
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artisanId]);

  // Rafraichit automatiquement la liste (ex: un devis qui vient d'etre
  // signe par le client) sans que l'artisan ait besoin de recharger la page.
  useDevisRealtime(artisanId, charger);

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

  async function supprimer(id: string) {
    setEnCours(id);

    // Pas de suppression en cascade cote base : on retire d'abord les
    // lignes, avant la ligne "devis" elle-meme.
    await supabase.from("lignes_devis").delete().eq("devis_id", id);
    const { error } = await supabase.from("devis").delete().eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setDevis((liste) => liste.filter((d) => d.id !== id));
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
          onSupprimer={supprimer}
        />
      ))}
    </main>
  );
}
