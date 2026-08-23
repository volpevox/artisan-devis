"use client";
import { useState } from "react";

interface CarteDocumentProps {
  d: any;
  type: "devis" | "facture";
  enCours: string;
  message?: string;
  onTransformerEnFacture?: (id: string) => void;
  onEnvoyerFacture?: (id: string) => void;
  onMarquerPayee?: (id: string, moyenPaiement: string) => void;
  onAnnulerPaiement?: (id: string) => void;
}

const MOYENS_PAIEMENT = ["Carte bancaire", "Virement bancaire", "Chèque", "Espèces"];

function badge(statut: string) {
  if (statut === "signe") return { texte: "Signé", classe: "badge-success" };
  if (statut === "envoye") return { texte: "En attente de signature", classe: "badge-warning" };
  return { texte: "Brouillon", classe: "badge-neutral" };
}

export function CarteDocument({
  d,
  type,
  enCours,
  message,
  onTransformerEnFacture,
  onEnvoyerFacture,
  onMarquerPayee,
  onAnnulerPaiement,
}: CarteDocumentProps) {
  const [moyenChoisi, setMoyenChoisi] = useState(MOYENS_PAIEMENT[0]);
  const b = badge(d.statut);
  const numero = type === "facture" ? d.numero_facture : d.numero_devis;
  const titre = type === "facture" ? "Facture" : "Devis";

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, overflowWrap: "break-word" }}>{d.client_nom || "(sans nom)"}</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--muted)" }}>
            {numero ? `${titre} n°${numero} · ` : ""}
            {new Date(d.created_at).toLocaleDateString("fr-FR")} · {d.total} €
          </p>
        </div>
        {type === "devis" && (
          <div style={{ flexShrink: 0 }}>
            <span className={`badge ${b.classe}`}>{b.texte}</span>
          </div>
        )}
      </div>

      {d.statut === "signe" && d.signe_le && (
        <p style={{ fontSize: 12, color: "var(--success)", margin: "8px 0 0" }}>
          Signé le {new Date(d.signe_le).toLocaleDateString("fr-FR")}
        </p>
      )}
      {type === "facture" && d.facture_creee_le && (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
          Facture créée le {new Date(d.facture_creee_le).toLocaleDateString("fr-FR")}
          {d.facture_envoyee_le
            ? ` · envoyée le ${new Date(d.facture_envoyee_le).toLocaleDateString("fr-FR")}`
            : ""}
        </p>
      )}

      {type === "facture" && d.payee_le && (
        <p style={{ fontSize: 12, color: "var(--success)", margin: "4px 0 0" }}>
          ✓ Payée le {new Date(d.payee_le).toLocaleDateString("fr-FR")}
          {d.moyen_paiement ? ` par ${d.moyen_paiement}` : ""}
          {onAnnulerPaiement && (
            <button
              onClick={() => onAnnulerPaiement(d.id)}
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11, textDecoration: "underline", cursor: "pointer", padding: 0, marginLeft: 8 }}
            >
              Annuler
            </button>
          )}
        </p>
      )}

      <div className="link-row">
        <a href={`/api/devis-pdf/${d.id}?t=${Date.now()}`} target="_blank" rel="noreferrer">
          {type === "facture" ? "Voir la facture (PDF)" : d.statut === "signe" ? "Voir le PDF signé" : "Voir le devis (PDF)"}
        </a>
        {type === "devis" && d.statut === "signe" && onTransformerEnFacture && (
          <button onClick={() => onTransformerEnFacture(d.id)} disabled={enCours === d.id}>
            Transformer en facture
          </button>
        )}
        {type === "facture" && onEnvoyerFacture && (
          <button onClick={() => onEnvoyerFacture(d.id)} disabled={enCours === d.id || !d.client_email}>
            {d.facture_envoyee_le ? "Renvoyer la facture" : "Envoyer la facture par email"}
          </button>
        )}
      </div>

      {type === "facture" && !d.payee_le && onMarquerPayee && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
          <select
            className="field"
            style={{ margin: 0, width: "auto" }}
            value={moyenChoisi}
            onChange={(e) => setMoyenChoisi(e.target.value)}
          >
            {MOYENS_PAIEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button onClick={() => onMarquerPayee(d.id, moyenChoisi)} disabled={enCours === d.id}>
            Marquer comme payée
          </button>
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}
