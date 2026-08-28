"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AideEcranAccueil, estSurEcranAccueil } from "./AideEcranAccueil";

// Affichee juste apres une inscription reussie. Deux variantes selon le
// parametre "bienvenue" ajoute a l'URL par app/connexion/page.tsx :
//   ?bienvenue=1       -> abonnement Stripe demarre (retour de /api/creer-abonnement)
//   ?bienvenue=gratuit -> email present dans la liste d'acces gratuit (/api/activer-invite)
// On lit le parametre au montage plutot que via useSearchParams pour eviter
// d'avoir a englober la page /profil dans un <Suspense> pour ce seul usage.
//
// Deroulement : etape "bienvenue" (resume du parcours) puis, si l'appli
// tourne dans un onglet navigateur (pas deja installee), etape
// "ecran-accueil" (comment ajouter VolpeVox a l'ecran d'accueil).
export function PropositionCommentCaMarche() {
  const [variante, setVariante] = useState<"abonne" | "gratuit" | null>(null);
  const [etape, setEtape] = useState<"bienvenue" | "ecran-accueil">("bienvenue");

  useEffect(() => {
    const valeur = new URLSearchParams(window.location.search).get("bienvenue");
    if (valeur === "1") setVariante("abonne");
    else if (valeur === "gratuit") setVariante("gratuit");
  }, []);

  if (!variante) return null;

  const gratuit = variante === "gratuit";

  function continuer() {
    // On enchaine sur l'aide "ecran d'accueil" seulement dans un onglet
    // navigateur ; en mode app deja installee, on ferme directement.
    if (etape === "bienvenue" && !estSurEcranAccueil()) {
      setEtape("ecran-accueil");
    } else {
      setVariante(null);
    }
  }

  // Rendu via un portail directement dans <body> : le popup est en
  // "position: fixed", qui devrait normalement s'afficher au-dessus de tout
  // (y compris le menu du bas, lui en flux normal sans z-index), mais un
  // artisan a constate le bouton passer visuellement sous le menu sur son
  // iPhone. Le portail sort le popup de toute la hierarchie de la page.
  return createPortal(
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
        {etape === "ecran-accueil" ? (
          <>
            <svg className="notif-propose-icone" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="6" y="3" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M12 7v6.5m0 0-2.3-2.3M12 13.5l2.3-2.3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="notif-propose-titre">Ajoute VolpeVox à ton écran d'accueil</p>
            <div style={{ marginBottom: 18 }}>
              <AideEcranAccueil />
            </div>
            <div className="notif-propose-actions">
              <button type="button" className="btn btn-primary" onClick={() => setVariante(null)}>
                C&apos;est parti !
              </button>
            </div>
          </>
        ) : gratuit ? (
          <>
            <span className="notif-propose-cadeau">🎁 Offert par VolpeVox</span>
            <p className="notif-propose-titre">Ton premier mois est offert 🎉</p>
            <p className="notif-propose-texte">
              VolpeVox t&apos;offre un mois d&apos;accès complet, gratuit et sans engagement — aucune carte bancaire
              demandée. Tu dictes ta prestation, l&apos;IA remplit le devis, ton client signe sur son téléphone, tu
              passes en facture et il paie en ligne, avec des relances automatiques à chaque étape. Commence par
              compléter ton profil ci-dessous : ces infos apparaissent sur tous tes documents.
            </p>
            <div className="notif-propose-actions">
              <Link href="/parametres/comment-ca-marche" className="btn btn-primary">
                Voir le guide complet
              </Link>
              <button type="button" className="btn btn-outline" onClick={continuer}>
                Compris, je commence
              </button>
            </div>
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
            <div className="notif-propose-actions">
              <Link href="/parametres/comment-ca-marche" className="btn btn-primary">
                Voir le guide complet
              </Link>
              <button type="button" className="btn btn-outline" onClick={continuer}>
                Compris, je commence
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
