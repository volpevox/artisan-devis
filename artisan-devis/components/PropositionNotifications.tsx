"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { notificationsPossibles, abonnementActuel, activerNotifications } from "@/lib/pushClient";
import { estSurEcranAccueil } from "./AideEcranAccueil";

interface PropositionNotificationsProps {
  session: Session | null;
  artisanId: string | null;
}

// Propose l'activation des notifications push a la toute premiere ouverture
// de l'appli (une seule fois par artisan, marque en base via
// notifications_proposees_le) plutot que de laisser l'artisan la decouvrir
// seul dans Parametres.
export function PropositionNotifications({ session, artisanId }: PropositionNotificationsProps) {
  const [visible, setVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!artisanId || !notificationsPossibles() || Notification.permission === "denied") return;

    let actif = true;

    async function verifier() {
      const [{ data }, abonnement] = await Promise.all([
        supabase
          .from("artisans")
          .select("notifications_proposees_le, ecran_accueil_propose_le")
          .eq("id", artisanId)
          .maybeSingle(),
        abonnementActuel(),
      ]);

      // On laisse d'abord passer le popup "Ajouter a l'ecran d'accueil"
      // (PropositionEcranAccueil) s'il est encore en attente : pas deux
      // popups empiles a la premiere ouverture.
      const ecranAccueilEnAttente = !estSurEcranAccueil() && !data?.ecran_accueil_propose_le;

      if (actif && !data?.notifications_proposees_le && !abonnement && !ecranAccueilEnAttente) {
        setVisible(true);
      }
    }
    verifier();

    return () => {
      actif = false;
    };
  }, [artisanId]);

  async function marquerProposee() {
    if (!artisanId) return;
    await supabase.from("artisans").update({ notifications_proposees_le: new Date().toISOString() }).eq("id", artisanId);
  }

  async function activer() {
    if (!session) return;
    setEnCours(true);
    setErreur("");

    try {
      await activerNotifications(session.access_token);
      await marquerProposee();
      setVisible(false);
    } catch (e: any) {
      setErreur(e.message || "Erreur");
      setEnCours(false);
    }
  }

  async function plusTard() {
    setVisible(false);
    await marquerProposee();
  }

  if (!visible) return null;

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
        <p className="notif-propose-titre">Active les notifications</p>
        <p className="notif-propose-texte">
          Sois alerté dès qu'un client signe un devis ou paie une facture, sans avoir à ouvrir l'appli.
        </p>
        {erreur && <p className="message">{erreur}</p>}
        <div className="notif-propose-actions">
          <button type="button" className="btn btn-primary" onClick={activer} disabled={enCours}>
            Activer les notifications
          </button>
          <button type="button" className="btn btn-outline" onClick={plusTard} disabled={enCours}>
            Plus tard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
