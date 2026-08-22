"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

export default function MesDevis() {
  const { artisanId, loading: chargementSession } = useArtisanSession();
  const [devis, setDevis] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [copie, setCopie] = useState("");
  const [enCours, setEnCours] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!artisanId) return;

    async function charger() {
      const { data } = await supabase.from("devis").select("*").order("created_at", { ascending: false });
      setDevis(data || []);
      setChargement(false);
    }
    charger();
  }, [artisanId]);

  function copierLien(id: string) {
    const lien = `${window.location.origin}/signer/${id}`;
    navigator.clipboard.writeText(lien);
    setCopie(id);
    setTimeout(() => setCopie(""), 2000);
  }

  function badge(statut: string) {
    if (statut === "signe") return { texte: "Signé", classe: "badge-success" };
    if (statut === "envoye") return { texte: "En attente de signature", classe: "badge-warning" };
    return { texte: "Brouillon", classe: "badge-neutral" };
  }

  async function transformerEnFacture(id: string) {
    setEnCours(id);
    const factureCreeeLe = new Date().toISOString();

    const { error } = await supabase
      .from("devis")
      .update({ est_facture: true, facture_creee_le: factureCreeeLe })
      .eq("id", id);

    setEnCours("");

    if (error) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + error.message }));
      return;
    }

    setDevis((liste) =>
      liste.map((d) => (d.id === id ? { ...d, est_facture: true, facture_creee_le: factureCreeeLe } : d))
    );
    setMessages((m) => ({ ...m, [id]: "Devis transformé en facture !" }));
  }

  async function envoyerFacture(id: string) {
    setEnCours(id);
    setMessages((m) => ({ ...m, [id]: "Envoi de la facture en cours..." }));

    const res = await fetch(`/api/facture/${id}`, { method: "POST" });
    const data = await res.json();

    setEnCours("");

    if (data.erreur) {
      setMessages((m) => ({ ...m, [id]: "Erreur : " + data.erreur }));
      return;
    }

    const factureEnvoyeeLe = new Date().toISOString();
    setDevis((liste) => liste.map((d) => (d.id === id ? { ...d, facture_envoyee_le: factureEnvoyeeLe } : d)));
    setMessages((m) => ({ ...m, [id]: "Facture envoyée au client !" }));
  }

  return (
    <main className="page-shell page-shell--large">
      <Topbar />

      <h1 className="page-title">Mes devis</h1>

      {(chargementSession || chargement) && <p className="message">Chargement...</p>}
      {!chargementSession && !chargement && devis.length === 0 && (
        <p className="message">Aucun devis enregistré pour l'instant.</p>
      )}

      {devis.map((d) => {
        const b = badge(d.statut);
        return (
          <div key={d.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, overflowWrap: "break-word" }}>{d.client_nom || "(sans nom)"}</p>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  {new Date(d.created_at).toLocaleDateString("fr-FR")} · {d.total} €
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span className={`badge ${b.classe}`}>{b.texte}</span>
                {d.est_facture && <span className="badge badge-success">Facture</span>}
              </div>
            </div>

            {d.statut === "signe" && d.signe_le && (
              <p style={{ fontSize: 12, color: "var(--success)", margin: "8px 0 0" }}>
                Signé le {new Date(d.signe_le).toLocaleDateString("fr-FR")}
              </p>
            )}
            {d.est_facture && d.facture_creee_le && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
                Facture créée le {new Date(d.facture_creee_le).toLocaleDateString("fr-FR")}
                {d.facture_envoyee_le
                  ? ` · envoyée le ${new Date(d.facture_envoyee_le).toLocaleDateString("fr-FR")}`
                  : ""}
              </p>
            )}

            <div className="link-row">
              <a href={`/signer/${d.id}`} target="_blank" rel="noreferrer">
                Voir le devis
              </a>
              <a href={`/api/devis-pdf/${d.id}`} target="_blank" rel="noreferrer">
                {d.est_facture ? "Télécharger la facture" : d.statut === "signe" ? "Télécharger le PDF signé" : "Télécharger le PDF"}
              </a>
              <button onClick={() => copierLien(d.id)}>{copie === d.id ? "Copié !" : "Copier le lien"}</button>

              {d.statut === "signe" && !d.est_facture && (
                <button onClick={() => transformerEnFacture(d.id)} disabled={enCours === d.id}>
                  Transformer en facture
                </button>
              )}
              {d.est_facture && (
                <button onClick={() => envoyerFacture(d.id)} disabled={enCours === d.id || !d.client_email}>
                  {d.facture_envoyee_le ? "Renvoyer la facture" : "Envoyer la facture par email"}
                </button>
              )}
            </div>

            {messages[d.id] && <p className="message">{messages[d.id]}</p>}
          </div>
        );
      })}
    </main>
  );
}
