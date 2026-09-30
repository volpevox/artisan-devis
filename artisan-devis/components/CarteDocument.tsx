"use client";
import { useEffect, useRef, useState } from "react";
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
  onArchiver?: (id: string, archiver: boolean) => void;
}

const MOYENS_PAIEMENT = ["Carte bancaire", "Virement bancaire", "Chèque", "Espèces"];

function jour(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "";
}

export function euros(n: number) {
  return `${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

// Carte « ticket » d'un devis ou d'une facture, dans l'identite des PDF :
// bord de couleur selon l'etat, montant encadre, parcours en pastilles, UN
// bouton pour la prochaine etape et le reste dans le menu « ··· ».
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
  onArchiver,
}: CarteDocumentProps) {
  const [moyenChoisi, setMoyenChoisi] = useState(MOYENS_PAIEMENT[0]);
  const [lienCopie, setLienCopie] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [confirmation, setConfirmation] = useState<"" | "suppression" | "avoir" | "paiement">("");
  const [demandeDatePrestation, setDemandeDatePrestation] = useState(false);
  const carteRef = useRef<HTMLDivElement>(null);

  const estFacture = type === "facture";
  const numero = estFacture ? d.numero_facture : d.numero_devis;
  const titre = estFacture ? "Facture" : "Devis";
  const occupe = enCours === d.id;
  // Facture deja envoyee : elle ne se supprime plus, elle s'annule par un
  // avoir (pas de trou dans la numerotation ; en 2027 elle sera deja chez le
  // fisc). Non envoyee : suppression possible (erreur, doublon).
  const factureEnvoyee = estFacture && Boolean(d.facture_envoyee_le);
  const annulee = estFacture && Boolean(d.avoir_numero);
  const payee = estFacture && Boolean(d.payee_le);
  const lienPdf = `/devis-pdf/${d.id}`;

  // Menu « ··· » : se ferme en touchant ailleurs.
  useEffect(() => {
    if (!menuOuvert) return;
    function fermer(e: Event) {
      if (carteRef.current && !carteRef.current.contains(e.target as Node)) setMenuOuvert(false);
    }
    document.addEventListener("pointerdown", fermer);
    return () => document.removeEventListener("pointerdown", fermer);
  }, [menuOuvert]);

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

  // --- Etat : couleur, parcours et ligne de statut ---
  let etat: "brouillon" | "attente" | "ok" | "annulee" = "attente";
  let etapes: string[] = [];
  let etapesFaites = 0; // nombre d'etapes deja franchies
  let statut: { texte: string; ton: "" | "or" | "vert" | "rouge" } = { texte: "", ton: "" };

  if (!estFacture) {
    etapes = ["Envoyé", "Signé", "Facturé", "Réglé"];
    if (d.statut === "signe") {
      etat = "ok";
      etapesFaites = 2;
      statut = {
        texte: `✓ Signé le ${jour(d.signe_le)}${d.lieu_signature ? ` à ${d.lieu_signature}` : ""}`,
        ton: "vert",
      };
    } else if (d.statut === "envoye") {
      etapesFaites = 1;
      statut = {
        texte: `⏳ ${d.envoye_le ? `Envoyé le ${jour(d.envoye_le)}, en` : "En"} attente de signature`,
        ton: "or",
      };
    } else {
      etat = "brouillon";
      statut = { texte: "Brouillon, pas encore envoyé", ton: "" };
    }
  } else if (annulee) {
    etat = "annulee";
    statut = {
      texte: `✕ Annulée par l'avoir AV-${d.avoir_numero}${d.avoir_cree_le ? ` le ${jour(d.avoir_cree_le)}` : ""}`,
      ton: "rouge",
    };
  } else {
    // Facture issue d'un devis signe : parcours complet ; dictee directement :
    // il commence a la prestation.
    etapes = d.signe_le ? ["Devis", "Signé", "Facturé", "Réglé"] : ["Prestation", "Facturé", "Réglé"];
    etapesFaites = payee ? etapes.length : etapes.length - 1;
    if (payee) {
      etat = "ok";
      statut = {
        texte: `✓ Réglée le ${jour(d.payee_le)}${d.moyen_paiement ? ` par ${d.moyen_paiement.toLowerCase()}` : ""}`,
        ton: "vert",
      };
    } else if (factureEnvoyee) {
      statut = { texte: `Envoyée le ${jour(d.facture_envoyee_le)}, en attente de paiement`, ton: "or" };
    } else {
      statut = { texte: `Créée le ${jour(d.facture_creee_le)}, pas encore envoyée`, ton: "" };
    }
  }

  // --- Action principale : la prochaine etape ---
  let principale: { texte: string; action?: () => void; lien?: string; pleine: boolean } = {
    texte: `Voir ${estFacture ? "la facture" : "le devis"}`,
    lien: lienPdf,
    pleine: false,
  };
  if (!estFacture && d.statut === "signe" && onTransformerEnFacture) {
    principale = { texte: "Transformer en facture", action: () => setDemandeDatePrestation(true), pleine: true };
  } else if (annulee) {
    principale = { texte: "Voir l'avoir", lien: `${lienPdf}?avoir=1`, pleine: false };
  } else if (estFacture && !payee && !factureEnvoyee && d.client_email && onEnvoyerFacture) {
    principale = { texte: "Envoyer au client", action: () => onEnvoyerFacture(d.id), pleine: true };
  } else if (estFacture && !payee && onMarquerPayee) {
    principale = { texte: "Marquer payée", action: () => setConfirmation("paiement"), pleine: true };
  }

  // --- Menu « ··· » ---
  const elementsMenu: { texte: string; action?: () => void; lien?: string; rouge?: boolean }[] = [];
  if (!principale.lien || annulee) {
    elementsMenu.push({ texte: `📄 Voir ${estFacture ? "la facture" : "le devis"} (PDF)`, lien: lienPdf });
  }
  // Modifier : devis brouillon ou envoye seulement. Un devis signe engage le
  // client sur cette version, il ne se modifie plus (nouveau devis si besoin).
  if (!estFacture && d.statut !== "signe") {
    elementsMenu.push({ texte: "✏ Modifier", lien: `/?modifier=${d.id}` });
  }
  elementsMenu.push({ texte: lienCopie ? "✓ Lien copié !" : "↗ Partager", action: partager });
  if (estFacture && !annulee && factureEnvoyee && d.client_email && onEnvoyerFacture) {
    elementsMenu.push({ texte: "✉ Renvoyer par email", action: () => onEnvoyerFacture(d.id) });
  }
  if (payee && !annulee && onAnnulerPaiement) {
    elementsMenu.push({ texte: "↺ Annuler le paiement", action: () => onAnnulerPaiement(d.id) });
  }
  // Archivage (rangement) : seulement une facture terminee, reglee ou
  // annulee -- une facture impayee archivee risquerait d'etre oubliee.
  if (estFacture && onArchiver) {
    if (d.archivee_le) {
      elementsMenu.push({ texte: "↩ Désarchiver", action: () => onArchiver(d.id, false) });
    } else if (payee || annulee) {
      elementsMenu.push({ texte: "🗄 Archiver", action: () => onArchiver(d.id, true) });
    }
  }
  if (factureEnvoyee && !annulee && onAnnulerParAvoir) {
    elementsMenu.push({ texte: "⊘ Annuler par un avoir", action: () => setConfirmation("avoir"), rouge: true });
  }
  if (!factureEnvoyee && onSupprimer) {
    elementsMenu.push({ texte: "🗑 Supprimer", action: () => setConfirmation("suppression"), rouge: true });
  }

  const largeurTrait =
    etapes.length > 1 && etapesFaites > 1 ? ((Math.min(etapesFaites, etapes.length) - 1) / (etapes.length - 1)) * 76 : 0;

  return (
    <div ref={carteRef} className={`carte-doc carte-doc--${etat}${menuOuvert ? " carte-doc--menu" : ""}`}>
      <div className="carte-doc-haut">
        <div style={{ minWidth: 0 }}>
          <p className="carte-doc-nom">{d.client_nom || "(sans nom)"}</p>
          <p className="carte-doc-meta">
            {numero ? `${titre} n°${numero} · ` : ""}
            {jour(estFacture ? d.facture_creee_le || d.created_at : d.created_at)}
          </p>
        </div>
        <div className="carte-doc-montant">{euros(d.total)}</div>
      </div>

      {etapes.length > 0 && (
        <div className="carte-doc-parcours">
          <span className="carte-doc-parcours-fait" style={{ width: `${largeurTrait}%` }} />
          {etapes.map((e, i) => (
            <div
              key={e}
              className={`carte-doc-etape${i < etapesFaites ? " fait" : ""}${i === etapesFaites ? " actif" : ""}`}
            >
              {e}
            </div>
          ))}
        </div>
      )}

      {statut.texte && <p className={`carte-doc-statut ${statut.ton}`}>{statut.texte}</p>}

      {confirmation === "" && (
        <div className="carte-doc-actions">
          {principale.lien ? (
            <a className={principale.pleine ? "carte-doc-principal" : "carte-doc-secondaire"} href={principale.lien}>
              {principale.texte}
            </a>
          ) : (
            <button
              type="button"
              className={principale.pleine ? "carte-doc-principal" : "carte-doc-secondaire"}
              onClick={principale.action}
              disabled={occupe}
            >
              {principale.texte}
            </button>
          )}
          <button
            type="button"
            className="carte-doc-plus"
            aria-label="Plus d'actions"
            aria-expanded={menuOuvert}
            onClick={() => setMenuOuvert((o) => !o)}
          >
            ···
          </button>
        </div>
      )}

      {menuOuvert && (
        <div className="carte-doc-menu" role="menu">
          {elementsMenu.map((el) =>
            el.lien ? (
              <a key={el.texte} role="menuitem" href={el.lien} className={el.rouge ? "rouge" : ""}>
                {el.texte}
              </a>
            ) : (
              <button
                key={el.texte}
                type="button"
                role="menuitem"
                className={el.rouge ? "rouge" : ""}
                disabled={occupe}
                onClick={() => {
                  setMenuOuvert(false);
                  el.action?.();
                }}
              >
                {el.texte}
              </button>
            )
          )}
        </div>
      )}

      {confirmation === "paiement" && onMarquerPayee && (
        <div className="carte-doc-confirmation">
          <span>Réglée par :</span>
          <select className="field" value={moyenChoisi} onChange={(e) => setMoyenChoisi(e.target.value)}>
            {MOYENS_PAIEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <div className="carte-doc-confirmation-boutons">
            <button
              type="button"
              className="carte-doc-principal"
              disabled={occupe}
              onClick={() => {
                setConfirmation("");
                onMarquerPayee(d.id, moyenChoisi);
              }}
            >
              Valider
            </button>
            <button type="button" className="carte-doc-secondaire" onClick={() => setConfirmation("")}>
              Retour
            </button>
          </div>
        </div>
      )}

      {confirmation === "avoir" && onAnnulerParAvoir && (
        <div className="carte-doc-confirmation">
          <span className="rouge">
            Annuler cette facture ? Un avoir (la même facture en négatif) sera créé
            {d.client_email ? " et envoyé au client" : ""}. C'est définitif.
          </span>
          <div className="carte-doc-confirmation-boutons">
            <button
              type="button"
              className="carte-doc-principal carte-doc-principal--rouge"
              disabled={occupe}
              onClick={() => {
                setConfirmation("");
                onAnnulerParAvoir(d.id);
              }}
            >
              Oui, créer l'avoir
            </button>
            <button type="button" className="carte-doc-secondaire" onClick={() => setConfirmation("")}>
              Retour
            </button>
          </div>
        </div>
      )}

      {confirmation === "suppression" && onSupprimer && (
        <div className="carte-doc-confirmation">
          <span className="rouge">
            {estFacture
              ? "Supprimer cette facture définitivement ? Elle n'a pas encore été envoyée au client : à faire seulement en cas d'erreur ou de doublon."
              : "Supprimer ce devis définitivement ?"}
          </span>
          <div className="carte-doc-confirmation-boutons">
            <button
              type="button"
              className="carte-doc-principal carte-doc-principal--rouge"
              disabled={occupe}
              onClick={() => onSupprimer(d.id)}
            >
              {occupe ? "Suppression..." : "Oui, supprimer"}
            </button>
            <button type="button" className="carte-doc-secondaire" onClick={() => setConfirmation("")} disabled={occupe}>
              Retour
            </button>
          </div>
        </div>
      )}

      {demandeDatePrestation && onTransformerEnFacture && (
        <PopupDatePrestation
          dateConnue={d.date_prestation}
          enCours={occupe}
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
