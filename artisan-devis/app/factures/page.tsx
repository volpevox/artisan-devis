"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { useDevisRealtime } from "@/lib/useDevisRealtime";
import { CarteDocument } from "@/components/CarteDocument";

export default function MesFactures() {
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [factures, setFactures] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function charger() {
    const { data } = await supabase
      .from("devis")
      .select("*")
      .eq("est_facture", true)
      .order("facture_creee_le", { ascending: false });
    setFactures(data || []);
    setChargement(false);

    // Marque les factures comme vues, pour faire disparaitre la pastille de
    // notification dans l'en-tete et le menu du bas.
    const idsNonVues = (data || []).filter((d) => !d.facture_vue_le).map((d) => d.id);
    if (idsNonVues.length > 0) {
      await supabase.from("devis").update({ facture_vue_le: new Date().toISOString() }).in("id", idsNonVues);
    }
  }

  useEffect(() => {
    if (!artisanId) return;
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artisanId]);

  // Rafraichit automatiquement la liste (ex: une facture qui vient d'etre
  // payee en ligne) sans que l'artisan ait besoin de recharger la page.
  useDevisRealtime(artisanId, charger);

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

  async function marquerPayee(id: string, moyenPaiement: string) {
    setEnCours(id);
    const payeeLe = new Date().toISOString();

    const { error } = await supabase.from("devis").update({ payee_le: payeeLe, moyen_paiement: moyenPaiement }).eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setFactures((liste) => liste.map((d) => (d.id === id ? { ...d, payee_le: payeeLe, moyen_paiement: moyenPaiement } : d)));
    setMessages((m) => ({ ...m, [id]: "Facture marquée comme payée !" }));
  }

  async function annulerPaiement(id: string) {
    setEnCours(id);

    const { error } = await supabase.from("devis").update({ payee_le: null, moyen_paiement: null }).eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setFactures((liste) => liste.map((d) => (d.id === id ? { ...d, payee_le: null, moyen_paiement: null } : d)));
    setMessages((m) => ({ ...m, [id]: "" }));
  }

  async function supprimer(id: string) {
    setEnCours(id);

    // Pas de suppression en cascade cote base : on retire d'abord les
    // lignes, avant la ligne "devis" (ici une facture) elle-meme.
    await supabase.from("lignes_devis").delete().eq("devis_id", id);
    const { error } = await supabase.from("devis").delete().eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setFactures((liste) => liste.filter((d) => d.id !== id));
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
          onMarquerPayee={marquerPayee}
          onAnnulerPaiement={annulerPaiement}
          onSupprimer={supprimer}
        />
      ))}
    </main>
  );
}
