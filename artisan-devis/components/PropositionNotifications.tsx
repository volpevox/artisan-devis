"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";
import {
  notificationsPossibles,
  activerNotifications,
  resynchroniserPush,
  pushEtaitActive,
} from "@/lib/pushClient";

interface PropositionNotificationsProps {
  session: Session | null;
  artisanId: string | null;
}

// A chaque ouverture de la page de dictee : si l'artisan avait active les
// notifications sur cet appareil, tente de reparer en silence l'abonnement
// (iOS l'invalide regulierement sans prevenir). Si iOS a carrement retire
// l'autorisation, affiche un rappel pour la redonner plutot que de laisser
// l'artisan sans notification sans le savoir.
//
// La premiere proposition d'activation ne se fait plus ici (elle
// interrompait le nouvel inscrit avant son premier devis) mais apres le
// premier envoi : voir components/ProposerApresEnvoi.tsx.
export function PropositionNotifications({ session, artisanId }: PropositionNotificationsProps) {
  const [reactivation, setReactivation] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!artisanId || !session || !notificationsPossibles() || !pushEtaitActive()) return;

    let actif = true;
    resynchroniserPush(session.access_token).then((etat) => {
      if (actif && etat === "permission-perdue") setReactivation(true);
    });

    return () => {
      actif = false;
    };
  }, [artisanId, session]);

  async function activer() {
    if (!session) return;
    setEnCours(true);
    setErreur("");

    try {
      await activerNotifications(session.access_token);
      setReactivation(false);
    } catch (e: any) {
      setErreur(e.message || "Erreur");
      setEnCours(false);
    }
  }

  if (!reactivation) return null;

  // Portail directement dans <body>, voir PropositionCommentCaMarche.tsx :
  // meme structure de popup, meme risque que le bouton se retrouve
  // visuellement sous le menu du bas sur iPhone.
  return createPortal(
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
        <svg className="notif-propose-icone" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2.4a2 2 0 0 1-.5-1.4V8a5 5 0 0 0-5-5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <p className="notif-propose-titre">Réactive tes notifications</p>
        <p className="notif-propose-texte">
          iOS a coupé tes notifications. Réactive-les pour rester alerté dès qu&apos;un client signe un devis ou paie une
          facture.
        </p>
        {erreur && <p className="message">{erreur}</p>}
        <div className="notif-propose-actions">
          <button type="button" className="btn btn-primary" onClick={activer} disabled={enCours}>
            Réactiver
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setReactivation(false)} disabled={enCours}>
            Plus tard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
