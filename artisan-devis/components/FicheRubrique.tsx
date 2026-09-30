"use client";
import type { ReactNode } from "react";

// Rubrique repliable du profil, dans l'identite des cartes « ticket » :
// bord colore selon l'etat, resume sur une ligne, pastille d'etat. Repose
// sur <details> (ouverture/fermeture native, sans etat React).
export type EtatRubrique = "ok" | "attente" | "neutre";

const PASTILLE: Record<EtatRubrique, string> = {
  ok: "✓",
  attente: "À compléter",
  neutre: "Facultatif",
};

export function FicheRubrique({
  etat,
  icone,
  titre,
  resume,
  pastille,
  ouvert,
  children,
}: {
  etat: EtatRubrique;
  icone: ReactNode;
  titre: string;
  resume: string;
  pastille?: string;
  ouvert?: boolean;
  children: ReactNode;
}) {
  const classeEtat = etat === "ok" ? " fiche--ok" : etat === "neutre" ? " fiche--neutre" : "";
  return (
    <details className={`fiche fiche-rubrique${classeEtat}`} open={ouvert}>
      <summary>
        <span className="fiche-rubrique-icone">{icone}</span>
        <span className="fiche-rubrique-corps">
          <span className="fiche-rubrique-titre">{titre}</span>
          <span className="fiche-rubrique-resume">{resume}</span>
        </span>
        <span className={`pastille-etat${etat === "ok" ? " ok" : etat === "neutre" ? " neutre" : ""}`}>
          {pastille ?? PASTILLE[etat]}
        </span>
        <svg className="fiche-rubrique-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="fiche-rubrique-contenu">{children}</div>
    </details>
  );
}

// Icones des rubriques (meme trait que les icones des Parametres).
export const ICONES = {
  identite: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  adresse: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  legal: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  paiement: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 9.5h19M6.5 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  mentions: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 3v5h5M8.5 13h7M8.5 16.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  numerotation: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4 7 20M17 4l-2 16M4.5 9h15M3.5 15h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  logo: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 17.5 5-4.5 4 3.5 2.5-2 4.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
};
