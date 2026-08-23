interface CarteDocumentProps {
  d: any;
  type: "devis" | "facture";
  copie: string;
  enCours: string;
  message?: string;
  onCopierLien: (id: string) => void;
  onTransformerEnFacture?: (id: string) => void;
  onEnvoyerFacture?: (id: string) => void;
}

function badge(statut: string) {
  if (statut === "signe") return { texte: "Signé", classe: "badge-success" };
  if (statut === "envoye") return { texte: "En attente de signature", classe: "badge-warning" };
  return { texte: "Brouillon", classe: "badge-neutral" };
}

export function CarteDocument({
  d,
  type,
  copie,
  enCours,
  message,
  onCopierLien,
  onTransformerEnFacture,
  onEnvoyerFacture,
}: CarteDocumentProps) {
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

      <div className="link-row">
        <a href={`/signer/${d.id}`} target="_blank" rel="noreferrer">
          {type === "facture" ? "Voir la facture" : "Voir le devis"}
        </a>
        <a href={`/api/devis-pdf/${d.id}`} target="_blank" rel="noreferrer">
          {type === "facture" ? "Télécharger la facture" : d.statut === "signe" ? "Télécharger le PDF signé" : "Télécharger le PDF"}
        </a>
        <button onClick={() => onCopierLien(d.id)}>{copie === d.id ? "Copié !" : "Copier le lien"}</button>

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

      {message && <p className="message">{message}</p>}
    </div>
  );
}
