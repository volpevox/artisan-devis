"use client";
import { useState } from "react";
import { PopupDatePrestation } from "./PopupDatePrestation";

interface CarteDocumentProps {
  d: any;
  type: "devis" | "facture";
  enCours: string;
  message?: string;
  onTransformerEnFacture?: (id: string, datePrestation: string) => void;
  onEnvoyerFacture?: (id: string) => void;
  onMarquerPayee?: (id: string, moyenPaiement: string) => void;
  onAnnulerPaiement?: (id: string) => void;
  onSupprimer?: (id: string) => void;
  onAnnulerParAvoir?: (id: string) => void;
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
  onSupprimer,
  onAnnulerParAvoir,
}: CarteDocumentProps) {
  const [moyenChoisi, setMoyenChoisi] = useState(MOYENS_PAIEMENT[0]);
  const [lienCopie, setLienCopie] = useState(false);
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const [confirmationAvoir, setConfirmationAvoir] = useState(false);
  const [demandeDatePrestation, setDemandeDatePrestation] = useState(false);
  const b = badge(d.statut);
  const numero = type === "facture" ? d.numero_facture : d.numero_devis;
  const titre = type === "facture" ? "Facture" : "Devis";
  // Facture deja envoyee : elle ne se supprime plus, elle s'annule par un
  // avoir (pas de trou dans la numerotation ; en 2027 elle sera deja chez le
  // fisc). Non envoyee : suppression possible (erreur, doublon).
  const factureEnvoyee = type === "facture" && Boolean(d.facture_envoyee_le);
  const annulee = type === "facture" && Boolean(d.avoir_numero);

  async function partager() {
    const url = `${window.location.origin}/api/devis-pdf/${d.id}`;
    const titreDoc = `${titre}${numero ? ` n°${numero}` : ""} - ${d.client_nom || ""}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: titreDoc, url });
      } catch {
        // L'artisan a ferme le menu de partage sans rien choisir : rien a faire.
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setLienCopie(true);
    setTimeout(() => setLienCopie(false), 2000);
  }

  return (
    <div className="doc-card">
      <div className="doc-card-top">
        <div style={{ minWidth: 0 }}>
          <p className="doc-card-nom">{d.client_nom || "(sans nom)"}</p>
          <p className="doc-card-meta">
            {numero ? `${titre} n°${numero} · ` : ""}
            {new Date(d.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
        {type === "devis" && (
          <div style={{ flexShrink: 0 }}>
            <span className={`badge ${b.classe}`}>{b.texte}</span>
          </div>
        )}
      </div>

      <p className="doc-card-total" style={annulee ? { textDecoration: "line-through", opacity: 0.55 } : undefined}>
        {d.total} €
      </p>

      {d.statut === "signe" && d.signe_le && (
        <p className="doc-card-statut-ligne" style={{ color: "var(--success)" }}>
          ✓ Signé le {new Date(d.signe_le).toLocaleDateString("fr-FR")}
        </p>
      )}
      {type === "facture" && d.facture_creee_le && (
        <p className="doc-card-statut-ligne" style={{ color: "var(--muted)" }}>
          Facture créée le {new Date(d.facture_creee_le).toLocaleDateString("fr-FR")}
          {d.facture_envoyee_le
            ? ` · envoyée le ${new Date(d.facture_envoyee_le).toLocaleDateString("fr-FR")}`
            : ""}
        </p>
      )}

      {annulee && (
        <p className="doc-card-statut-ligne" style={{ color: "var(--danger)" }}>
          ✕ Annulée par l'avoir AV-{d.avoir_numero}
          {d.avoir_cree_le ? ` le ${new Date(d.avoir_cree_le).toLocaleDateString("fr-FR")}` : ""}
        </p>
      )}

      {type === "facture" && d.payee_le && (
        <p className="doc-card-statut-ligne" style={{ color: "var(--success)" }}>
          ✓ Payée le {new Date(d.payee_le).toLocaleDateString("fr-FR")}
          {d.moyen_paiement ? ` par ${d.moyen_paiement}` : ""}
          {onAnnulerPaiement && !annulee && (
            <button
              onClick={() => onAnnulerPaiement(d.id)}
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11, textDecoration: "underline", cursor: "pointer", padding: 0, marginLeft: 8 }}
            >
              Annuler
            </button>
          )}
        </p>
      )}

      <div className="doc-card-actions">
        <a className="btn-ghost" href={`/devis-pdf/${d.id}`}>
          {type === "facture" ? "Voir la facture (PDF)" : d.statut === "signe" ? "Voir le PDF signé" : "Voir le devis (PDF)"}
        </a>
        {annulee && (
          <a className="btn-ghost" href={`/devis-pdf/${d.id}?avoir=1`}>
            Voir l'avoir (PDF)
          </a>
        )}
        <button className="btn-ghost" onClick={partager}>
          {lienCopie ? "Lien copié !" : "Partager"}
        </button>
        {type === "devis" && d.statut === "signe" && onTransformerEnFacture && (
          <button className="btn-solid" onClick={() => setDemandeDatePrestation(true)} disabled={enCours === d.id}>
            Transformer en facture
          </button>
        )}
        {type === "facture" && !annulee && onEnvoyerFacture && (
          <button className="btn-solid" onClick={() => onEnvoyerFacture(d.id)} disabled={enCours === d.id || !d.client_email}>
            {d.facture_envoyee_le ? "Renvoyer la facture" : "Envoyer la facture par email"}
          </button>
        )}
        {factureEnvoyee && !annulee && onAnnulerParAvoir && !confirmationAvoir && (
          <button className="btn-ghost btn-danger" onClick={() => setConfirmationAvoir(true)} disabled={enCours === d.id}>
            Annuler par un avoir
          </button>
        )}
        {onSupprimer && !factureEnvoyee && !confirmationSuppression && (
          <button
            className="btn-ghost btn-danger"
            onClick={() => setConfirmationSuppression(true)}
            disabled={enCours === d.id}
          >
            Supprimer
          </button>
        )}
      </div>

      {confirmationSuppression && onSupprimer && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
          <span style={{ fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
            {type === "facture"
              ? "Supprimer cette facture définitivement ? Elle n'a pas encore été envoyée au client : à faire seulement en cas d'erreur ou de doublon."
              : "Supprimer ce devis définitivement ?"}
          </span>
          <button
            className="btn-solid"
            style={{ background: "var(--danger)" }}
            onClick={() => onSupprimer(d.id)}
            disabled={enCours === d.id}
          >
            {enCours === d.id ? "Suppression..." : "Oui, supprimer"}
          </button>
          <button className="btn-ghost" onClick={() => setConfirmationSuppression(false)} disabled={enCours === d.id}>
            Annuler
          </button>
        </div>
      )}

      {confirmationAvoir && onAnnulerParAvoir && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
          <span style={{ fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
            Annuler cette facture ? Un avoir (la même facture en négatif) sera créé
            {d.client_email ? " et envoyé au client" : ""}. C'est définitif.
          </span>
          <button
            className="btn-solid"
            style={{ background: "var(--danger)" }}
            onClick={() => {
              setConfirmationAvoir(false);
              onAnnulerParAvoir(d.id);
            }}
            disabled={enCours === d.id}
          >
            Oui, créer l'avoir
          </button>
          <button className="btn-ghost" onClick={() => setConfirmationAvoir(false)} disabled={enCours === d.id}>
            Retour
          </button>
        </div>
      )}

      {type === "facture" && !annulee && !d.payee_le && onMarquerPayee && (
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
          <button className="btn-ghost" onClick={() => onMarquerPayee(d.id, moyenChoisi)} disabled={enCours === d.id}>
            Marquer comme payée
          </button>
        </div>
      )}

      {demandeDatePrestation && onTransformerEnFacture && (
        <PopupDatePrestation
          dateConnue={d.date_prestation}
          enCours={enCours === d.id}
          onValider={(date) => {
            setDemandeDatePrestation(false);
            onTransformerEnFacture(d.id, date);
          }}
          onAnnuler={() => setDemandeDatePrestation(false)}
        />
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}
