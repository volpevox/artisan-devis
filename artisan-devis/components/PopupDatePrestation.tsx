"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

// Demande la date de la prestation au moment de transformer un devis en
// facture : c'est une mention obligatoire de la facture quand elle differe de
// la date d'emission, et le mode Devis de la dictee ne la demande jamais.
// Pre-remplie avec la date du jour (ou celle deja connue du devis).
//
// Rendu via un portail dans <body>, comme les autres popups, pour passer
// au-dessus du menu du bas sur iPhone (voir PropositionCommentCaMarche).
//
// Seule popup qui ouvre le clavier (pour changer la date) : sur iPhone, un
// element en position: fixed colle en bas ne suit pas le clavier, qui vient
// alors recouvrir le champ et les boutons. On cale donc le fond sur la zone
// reellement visible (visualViewport), qui se reduit quand le clavier sort.

export function useZoneVisible(): CSSProperties | undefined {
  const [zone, setZone] = useState<CSSProperties>();
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const caler = () =>
      setZone({ top: vv.offsetTop, height: vv.height, bottom: "auto" });
    caler();
    vv.addEventListener("resize", caler);
    vv.addEventListener("scroll", caler);
    return () => {
      vv.removeEventListener("resize", caler);
      vv.removeEventListener("scroll", caler);
    };
  }, []);
  return zone;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function versAffichage(chiffres: string) {
  if (chiffres.length > 4) return `${chiffres.slice(0, 2)}/${chiffres.slice(2, 4)}/${chiffres.slice(4)}`;
  if (chiffres.length > 2) return `${chiffres.slice(0, 2)}/${chiffres.slice(2)}`;
  return chiffres;
}

// "JJ/MM/AAAA" -> "AAAA-MM-JJ", ou null si la date est incomplete ou impossible (ex: 31/02).
function versIso(affichage: string) {
  const chiffres = affichage.replace(/\D/g, "");
  if (chiffres.length !== 8) return null;
  const jour = Number(chiffres.slice(0, 2));
  const mois = Number(chiffres.slice(2, 4));
  const annee = Number(chiffres.slice(4, 8));
  const date = new Date(annee, mois - 1, jour);
  if (date.getFullYear() !== annee || date.getMonth() !== mois - 1 || date.getDate() !== jour) return null;
  return `${annee}-${pad(mois)}-${pad(jour)}`;
}

function dateInitiale(dateConnue?: string | null) {
  if (dateConnue) {
    const [a, m, j] = dateConnue.slice(0, 10).split("-");
    if (a && m && j) return `${j}/${m}/${a}`;
  }
  const aujourdhui = new Date();
  return `${pad(aujourdhui.getDate())}/${pad(aujourdhui.getMonth() + 1)}/${aujourdhui.getFullYear()}`;
}

interface PopupDatePrestationProps {
  dateConnue?: string | null;
  enCours: boolean;
  onValider: (datePrestation: string) => void;
  onAnnuler: () => void;
}

export function PopupDatePrestation({ dateConnue, enCours, onValider, onAnnuler }: PopupDatePrestationProps) {
  const [affichage, setAffichage] = useState(() => dateInitiale(dateConnue));
  const iso = versIso(affichage);
  const zoneVisible = useZoneVisible();

  return createPortal(
    <div className="notif-propose-fond" style={zoneVisible}>
      <div className="notif-propose-feuille">
        <p className="notif-propose-titre">Date de la prestation</p>
        <p className="notif-propose-texte">
          Elle apparaîtra sur la facture. Par défaut, c&apos;est la date d&apos;aujourd&apos;hui : change-la si
          l&apos;intervention a eu lieu un autre jour.
        </p>
        <div className="champ" style={{ marginBottom: 20 }}>
          <input
            className="field"
            type="text"
            inputMode="numeric"
            placeholder="JJ/MM/AAAA"
            maxLength={10}
            aria-label="Date de la prestation"
            onFocus={(e) => {
              // Laisse le clavier finir de sortir, puis garde le champ visible.
              const champ = e.currentTarget;
              setTimeout(() => champ.scrollIntoView({ block: "center" }), 300);
            }}
            value={affichage}
            onChange={(e) => setAffichage(versAffichage(e.target.value.replace(/\D/g, "").slice(0, 8)))}
          />
          {affichage.replace(/\D/g, "").length === 8 && !iso && (
            <p className="message" style={{ color: "var(--danger)", marginTop: 6 }}>
              Cette date n&apos;existe pas.
            </p>
          )}
        </div>
        <div className="notif-propose-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!iso || enCours}
            onClick={() => iso && onValider(iso)}
          >
            {enCours ? "Création..." : "Créer la facture"}
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
