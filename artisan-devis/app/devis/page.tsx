"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
    if (statut === "signe") return { texte: "Signé", couleur: "#1a7a3c", fond: "#e6f4ea" };
    if (statut === "envoye") return { texte: "En attente de signature", couleur: "#8a6d1a", fond: "#fdf3d9" };
    return { texte: "Brouillon", couleur: "#666", fond: "#eee" };
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 600 }}>
      <Link href="/" style={{ display: "block", marginBottom: 15 }}>
        ← Retour au devis
      </Link>

      <h1>Mes devis</h1>

      {chargement && <p>Chargement...</p>}
      {!chargement && devis.length === 0 && <p>Aucun devis enregistré pour l'instant.</p>}

      {devis.map((d) => {
        const b = badge(d.statut);
        return (
          <div
            key={d.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 6,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>{d.client_nom || "(sans nom)"}</p>
                <p style={{ margin: "2px 0", fontSize: 13, color: "#666" }}>
                  {new Date(d.created_at).toLocaleDateString("fr-FR")} · {d.total} €
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: "bold",
                  color: b.couleur,
                  background: b.fond,
                  padding: "3px 8px",
                  borderRadius: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {b.texte}
              </span>
            </div>

            {d.statut === "signe" && d.signe_le && (
              <p style={{ fontSize: 12, color: "#1a7a3c", margin: "6px 0 0" }}>
                Signé le {new Date(d.signe_le).toLocaleDateString("fr-FR")}
              </p>
            )}

            <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
              <a href={`/signer/${d.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                Voir le devis
              </a>
              <button
                onClick={() => copierLien(d.id)}
                style={{ fontSize: 13, background: "none", border: "none", color: "#333", cursor: "pointer", padding: 0 }}
              >
                {copie === d.id ? "Copié !" : "Copier le lien"}
              </button>
            </div>
          </div>
        );
      })}
    </main>
  );
}
