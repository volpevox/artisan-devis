"use client";
import { createPortal } from "react-dom";

// « Ton devis est presque pret » : proposee une seule fois par compte, au
// premier apercu/envoi d'un devis, s'il manque des infos du profil
// (assurance, mediateur, logo). « Plus tard » laisse l'action continuer.
// Portail dans <body> pour passer au-dessus du menu du bas sur iPhone.

export function PopupProfilIncomplet({
  onCompleter,
  onPlusTard,
  enCours,
}: {
  onCompleter: () => void;
  onPlusTard: () => void;
  enCours?: boolean;
}) {
  return createPortal(
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
        <p className="notif-propose-titre">Ton devis est presque prêt</p>
        <p className="notif-propose-texte">
          Pour que tes devis soient conformes, complète tes mentions obligatoires (assurance, médiateur). Ajoute aussi
          ton logo si tu veux qu&apos;il apparaisse sur tes devis et factures. Ça prend 2 minutes, une seule fois.
        </p>
        <div className="notif-propose-actions">
          <button type="button" className="btn btn-primary" onClick={onCompleter} disabled={enCours}>
            {enCours ? "Un instant..." : "Compléter maintenant"}
          </button>
          <button type="button" className="btn btn-outline" onClick={onPlusTard} disabled={enCours}>
            Plus tard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
