"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { LecteurVideoTuto } from "./VideoTuto";

// Affichee juste apres une inscription reussie. Deux variantes selon le
// parametre "bienvenue" ajoute a l'URL par app/connexion/page.tsx :
//   ?bienvenue=1       -> abonnement Stripe demarre (retour de /api/creer-abonnement)
//   ?bienvenue=gratuit -> email present dans la liste d'acces gratuit (/api/activer-invite)
// On lit le parametre au montage plutot que via useSearchParams pour eviter
// d'avoir a englober la page /profil dans un <Suspense> pour ce seul usage.

export function PropositionCommentCaMarche() {
  const [variante, setVariante] = useState<"abonne" | "gratuit" | null>(null);
  const [videoOuverte, setVideoOuverte] = useState(false);

  useEffect(() => {
    const valeur = new URLSearchParams(window.location.search).get("bienvenue");
    if (valeur === "1") setVariante("abonne");
    else if (valeur === "gratuit") setVariante("gratuit");
  }, []);

  if (!variante) return null;

  const gratuit = variante === "gratuit";

  // Le bouton ferme simplement la fenetre : l'aide "ecran d'accueil" est
  // proposee plus tard, apres le premier envoi (ProposerApresEnvoi.tsx).
  function continuer() {
    setVariante(null);
  }

  // Rendu via un portail directement dans <body> : le popup est en
  // "position: fixed", qui devrait normalement s'afficher au-dessus de tout
  // (y compris le menu du bas, lui en flux normal sans z-index), mais un
  // artisan a constate le bouton passer visuellement sous le menu sur son
  // iPhone. Le portail sort le popup de toute la hierarchie de la page.
  return createPortal(
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
        <div className="bienvenue">
          <Image src="/fox-icon.png" alt="" width={64} height={64} className="bienvenue-logo" />
          <p className="bienvenue-titre">Bienvenue sur VolpeVox</p>
          <span className="bienvenue-badge">
            {gratuit ? "Gratuit · sans carte bancaire" : "Ton abonnement est actif"}
          </span>

          <button
            type="button"
            className="btn btn-outline bienvenue-video-bouton"
            onClick={() => setVideoOuverte(true)}
          >
            ▶ Voir la vidéo (1 min)
          </button>
          {videoOuverte ? <LecteurVideoTuto onFermer={() => setVideoOuverte(false)} /> : null}

          <ol className="bienvenue-etapes">
            <li>
              <span>1</span>
              <div>
                <strong>Ton profil</strong>
                <small>Tes infos pour l&apos;en-tête de tes devis. Une seule fois.</small>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Tu dictes ton chantier</strong>
                <small>L&apos;IA remplit le devis : client, lignes, prix.</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Ton client signe</strong>
                <small>Sur son téléphone. Puis facture et paiement en 1 clic.</small>
              </div>
            </li>
          </ol>

          <button type="button" className="btn btn-primary bienvenue-bouton" onClick={continuer}>
            Je remplis mon profil →
          </button>
          <Link href="/parametres/comment-ca-marche" className="bienvenue-lien">
            Voir comment ça marche en détail
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
