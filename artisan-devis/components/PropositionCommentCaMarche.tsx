"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Affichee juste apres un premier abonnement reussi : Stripe redirige vers
// /profil?bienvenue=1 (voir /api/creer-abonnement), on lit le parametre au
// montage plutot que via useSearchParams pour eviter d'avoir a englober la
// page /profil dans un <Suspense> pour ce seul usage.
export function PropositionCommentCaMarche() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("bienvenue") === "1") setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
        <svg className="notif-propose-icone" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M9.5 9.3a2.5 2.5 0 1 1 3.3 2.4c-.7.3-1.3.9-1.3 1.8v.3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="16.8" r="1" fill="currentColor" />
        </svg>
        <p className="notif-propose-titre">Bienvenue chez VolpeVox 🎉</p>
        <p className="notif-propose-texte">
          Ton abonnement est actif. En résumé : tu dictes ta prestation, l&apos;IA remplit le devis, ton client signe
          sur son téléphone, tu passes en facture et il paie en ligne — avec des relances automatiques à chaque
          étape. Commence par compléter ton profil ci-dessous : ces infos apparaissent sur tous tes documents.
        </p>
        <div className="notif-propose-actions">
          <Link href="/parametres/comment-ca-marche" className="btn btn-primary">
            Voir le guide complet
          </Link>
          <button type="button" className="btn btn-outline" onClick={() => setVisible(false)}>
            Compris, je commence
          </button>
        </div>
      </div>
    </div>
  );
}
