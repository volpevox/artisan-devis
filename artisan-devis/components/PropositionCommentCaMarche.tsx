"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

// Affichee juste apres une inscription reussie. Deux variantes selon le
// parametre "bienvenue" ajoute a l'URL par app/connexion/page.tsx :
//   ?bienvenue=1       -> abonnement Stripe demarre (retour de /api/creer-abonnement)
//   ?bienvenue=gratuit -> email present dans la liste d'acces gratuit (/api/activer-invite)
// On lit le parametre au montage plutot que via useSearchParams pour eviter
// d'avoir a englober la page /profil dans un <Suspense> pour ce seul usage.
export function PropositionCommentCaMarche() {
  const [variante, setVariante] = useState<"abonne" | "gratuit" | null>(null);

  useEffect(() => {
    const valeur = new URLSearchParams(window.location.search).get("bienvenue");
    if (valeur === "1") setVariante("abonne");
    else if (valeur === "gratuit") setVariante("gratuit");
  }, []);

  if (!variante) return null;

  const gratuit = variante === "gratuit";

  // Rendu via un portail directement dans <body> : le popup est en
  // "position: fixed", qui devrait normalement s'afficher au-dessus de tout
  // (y compris le menu du bas, lui en flux normal sans z-index), mais un
  // artisan a constate le bouton passer visuellement sous le menu sur son
  // iPhone. Le portail sort le popup de toute la hierarchie de la page (et
  // donc de tout contexte d'empilement herite d'un ancetre) pour eviter ce
  // genre de souci de superposition, sans avoir a en identifier la cause
  // exacte cote Safari.
  return createPortal(
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
        {gratuit ? (
          <>
            <span className="notif-propose-cadeau">🎁 Offert par VolpeVox</span>
            <p className="notif-propose-titre">Ton premier mois est offert 🎉</p>
            <p className="notif-propose-texte">
              VolpeVox t&apos;offre un mois d&apos;accès complet, gratuit et sans engagement — aucune carte bancaire
              demandée. Tu dictes ta prestation, l&apos;IA remplit le devis, ton client signe sur son téléphone, tu
              passes en facture et il paie en ligne, avec des relances automatiques à chaque étape. Commence par
              compléter ton profil ci-dessous : ces infos apparaissent sur tous tes documents.
            </p>
          </>
        ) : (
          <>
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
              Ton abonnement est actif. En résumé : tu dictes ta prestation, l&apos;IA remplit le devis, ton client
              signe sur son téléphone, tu passes en facture et il paie en ligne — avec des relances automatiques à
              chaque étape. Commence par compléter ton profil ci-dessous : ces infos apparaissent sur tous tes
              documents.
            </p>
          </>
        )}
        <div className="notif-propose-actions">
          <Link href="/parametres/comment-ca-marche" className="btn btn-primary">
            Voir le guide complet
          </Link>
          <button type="button" className="btn btn-outline" onClick={() => setVariante(null)}>
            Compris, je commence
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
