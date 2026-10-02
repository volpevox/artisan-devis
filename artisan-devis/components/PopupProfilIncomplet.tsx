"use client";
import { createPortal } from "react-dom";

// « Ton devis est presque pret » : proposee une seule fois par compte, au
// premier apercu/envoi d'un devis, s'il manque des infos du profil
// (assurance, mediateur, logo). Le texte ne parle que de ce qui manque.
// « Plus tard » laisse l'action continuer.
// Portail dans <body> pour passer au-dessus du menu du bas sur iPhone.

export function PopupProfilIncomplet({
  manqueAssurance,
  manqueMediateur,
  manqueLogo,
  onCompleter,
  onPlusTard,
  enCours,
}: {
  manqueAssurance: boolean;
  manqueMediateur: boolean;
  manqueLogo: boolean;
  onCompleter: () => void;
  onPlusTard: () => void;
  enCours?: boolean;
}) {
  const mentions = [manqueAssurance && "ton assurance", manqueMediateur && "ton médiateur"].filter(Boolean).join(" et ");
  const seulLogo = !mentions && manqueLogo;

  return createPortal(
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
        <p className="notif-propose-titre">{seulLogo ? "Ton devis est prêt" : "Ton devis est presque prêt"}</p>
        <p className="notif-propose-texte">
          {seulLogo ? (
            <>
              Ajoute ton logo si tu veux qu&apos;il apparaisse sur tes devis et factures. Ça prend 1 minute, une seule
              fois.
            </>
          ) : (
            <>
              Pour que tes devis soient conformes, ajoute {mentions} (mentions obligatoires).
              {manqueLogo ? " Ajoute aussi ton logo si tu veux qu'il apparaisse sur tes devis et factures." : ""} Ça
              prend 2 minutes, une seule fois.
            </>
          )}
        </p>
        <div className="notif-propose-actions">
          <button type="button" className="btn btn-primary" onClick={onCompleter} disabled={enCours}>
            {enCours ? "Un instant..." : seulLogo ? "Ajouter mon logo" : "Compléter maintenant"}
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
