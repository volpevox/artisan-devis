"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useZoneVisible } from "./PopupDatePrestation";
import { acompteDepuisPourcentage, pourcentageAcompte, totalTTCDevis } from "@/lib/acompte";
import { enNombre } from "@/lib/nombre";
import { euros } from "./CarteDocument";

// « Demander un acompte » sur un devis signe. Pre-remplie avec le
// pourcentage lu dans les conditions de paiement de l'artisan (Mon compte,
// ex : « Acompte 30 % à la commande ») ; l'artisan peut changer le
// pourcentage ou saisir directement un montant. Le reste (numero, PDF,
// email au client) est fait par /api/acompte/[id].

interface PopupAcompteProps {
  totalHT: number;
  tauxTva: number;
  conditionsPaiement?: string | null;
  clientEmail?: string | null;
  enCours: boolean;
  onValider: (montant: number, pourcentage: number | null) => void;
  onAnnuler: () => void;
}

const enTexte = (n: number) => String(n).replace(".", ",");

export function PopupAcompte({
  totalHT,
  tauxTva,
  conditionsPaiement,
  clientEmail,
  enCours,
  onValider,
  onAnnuler,
}: PopupAcompteProps) {
  const totalTTC = totalTTCDevis(totalHT, tauxTva);
  const pctConditions = pourcentageAcompte(conditionsPaiement);
  const [pourcentage, setPourcentage] = useState(pctConditions ? enTexte(pctConditions) : "");
  const [montant, setMontant] = useState(
    pctConditions ? enTexte(acompteDepuisPourcentage(totalHT, pctConditions, tauxTva)) : ""
  );
  const zoneVisible = useZoneVisible();

  const montantNum = enNombre(montant);
  const pctNum = enNombre(pourcentage);
  const valide = montantNum > 0 && montantNum < totalTTC;

  function changerPourcentage(v: string) {
    setPourcentage(v);
    const p = enNombre(v);
    setMontant(p > 0 && p < 100 ? enTexte(acompteDepuisPourcentage(totalHT, p, tauxTva)) : "");
  }

  // Montant saisi a la main : le pourcentage suit (arrondi), pour info.
  function changerMontant(v: string) {
    setMontant(v);
    const m = enNombre(v);
    setPourcentage(m > 0 && totalTTC > 0 ? enTexte(Math.round((m / totalTTC) * 1000) / 10) : "");
  }

  // Pourcentage « rond » garde sur la facture (30 %) ; un montant libre qui
  // ne tombe pas juste n'affiche pas de pourcentage.
  const pctFinal =
    pctNum > 0 && pctNum < 100 && Math.abs(acompteDepuisPourcentage(totalHT, pctNum, tauxTva) - montantNum) < 0.01
      ? pctNum
      : null;

  return createPortal(
    <div className="notif-propose-fond" style={zoneVisible}>
      <div className="notif-propose-feuille">
        <p className="notif-propose-titre">Demander un acompte</p>
        <p className="notif-propose-texte">
          {/* Espace insecable fine -> normale : absente de la police du texte. */}
          Total du devis : <strong>{euros(totalTTC).replace(/\u202f/g, "\u00a0")}</strong>
          {pctConditions ? (
            <>
              <br />
              {enTexte(pctConditions)} % d&apos;après tes conditions de paiement.
            </>
          ) : null}
        </p>
        <div className="acompte-champs">
          <label className="champ">
            <span className="champ-label">Pourcentage</span>
            <span className="acompte-saisie">
              <input
                className="field"
                type="text"
                inputMode="decimal"
                placeholder="30"
                value={pourcentage}
                onChange={(e) => changerPourcentage(e.target.value)}
              />
              <span>%</span>
            </span>
          </label>
          <label className="champ">
            <span className="champ-label">Montant{tauxTva > 0 ? " TTC" : ""}</span>
            <span className="acompte-saisie">
              <input
                className="field"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={montant}
                onChange={(e) => changerMontant(e.target.value)}
              />
              <span>€</span>
            </span>
          </label>
        </div>
        {montantNum >= totalTTC && (
          <p className="message" style={{ color: "var(--danger)", marginTop: -8 }}>
            L&apos;acompte doit être inférieur au total du devis.
          </p>
        )}
        <p className="champ-aide" style={{ marginBottom: 18 }}>
          {clientEmail
            ? "La facture d'acompte sera envoyée au client par email, avec le paiement en ligne si tu l'as activé."
            : "Pas d'email client sur ce devis : tu pourras partager la facture d'acompte (PDF)."}{" "}
          Le montant sera déduit de la facture finale.
        </p>
        <div className="notif-propose-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valide || enCours}
            onClick={() => onValider(montantNum, pctFinal)}
          >
            {enCours ? "Création..." : clientEmail ? "Créer et envoyer" : "Créer la facture d'acompte"}
          </button>
          <button type="button" className="btn btn-outline" onClick={onAnnuler} disabled={enCours}>
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
