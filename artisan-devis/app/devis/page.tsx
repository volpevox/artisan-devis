"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";

export default function MesDevis() {
  const [devis, setDevis] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [copie, setCopie] = useState("");

  useEffect(() => {
    async function charger() {
      const { data } = await supabase.from("devis").select("*").order("created_at", { ascending: false });
      setDevis(data || []);
      setChargement(false);
    }
    charger();
  }, []);

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

  return (
    <main className="page-shell page-shell--large">
      <Topbar />

      <h1 className="page-title">Mes devis</h1>

      {chargement && <p className="message">Chargement...</p>}
      {!chargement && devis.length === 0 && <p className="message">Aucun devis enregistré pour l'instant.</p>}

      {devis.map((d) => {
        const b = badge(d.statut);
        return (
          <div key={d.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{d.client_nom || "(sans nom)"}</p>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  {new Date(d.created_at).toLocaleDateString("fr-FR")} · {d.total} €
                </p>
              </div>
              <span className={`badge ${b.classe}`}>{b.texte}</span>
            </div>

            {d.statut === "signe" && d.signe_le && (
              <p style={{ fontSize: 12, color: "var(--success)", margin: "8px 0 0" }}>
                Signé le {new Date(d.signe_le).toLocaleDateString("fr-FR")}
              </p>
            )}

            <div className="link-row">
              <a href={`/signer/${d.id}`} target="_blank" rel="noreferrer">
                Voir le devis
              </a>
              <a href={`/api/devis-pdf/${d.id}`} target="_blank" rel="noreferrer">
                {d.statut === "signe" ? "Télécharger le PDF signé" : "Télécharger le PDF"}
              </a>
              <button onClick={() => copierLien(d.id)}>{copie === d.id ? "Copié !" : "Copier le lien"}</button>
            </div>
          </div>
        );
      })}
    </main>
  );
}
