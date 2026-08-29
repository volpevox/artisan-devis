"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  notificationsPossibles,
  abonnementActuel,
  activerNotifications,
  resynchroniserPush,
  pushEtaitActive,
} from "@/lib/pushClient";

interface PropositionNotificationsProps {
  session: Session | null;
  artisanId: string | null;
}

// "cache"       -> rien a afficher
// "proposition" -> premiere ouverture : on propose d'activer (une seule fois)
// "reactivation" -> l'artisan avait active, iOS a retire l'autorisation :
//                   on ne peut pas reparer seul, on lui demande un geste
type Mode = "cache" | "proposition" | "reactivation";

// A la premiere ouverture de l'appli : propose d'activer les notifications
// push (une seule fois par artisan, marque en base via
// notifications_proposees_le).
//
// Aux ouvertures suivantes : si l'artisan les avait deja activees sur cet
// appareil, tente de reparer en silence l'abonnement (iOS l'invalide
// regulierement sans prevenir). Si iOS a carrement retire l'autorisation,
// affiche un rappel pour la redonner plutot que de laisser l'artisan sans
// notification sans le savoir.
export function PropositionNotifications({ session, artisanId }: PropositionNotificationsProps) {
  const [mode, setMode] = useState<Mode>("cache");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!artisanId || !session || !notificationsPossibles()) return;

    let actif = true;

    async function verifier() {
      // Cas 1 : les notifications ont deja ete activees sur cet appareil.
      // On repare l'abonnement en silence si besoin.
      if (pushEtaitActive()) {
        const etat = await resynchroniserPush(session!.access_token);
        if (actif && etat === "permission-perdue") setMode("reactivation");
        return;
      }

      // Cas 2 : jamais activees ici -> proposition initiale, une seule fois.
      if (Notification.permission === "denied") return;

      const [{ data }, abonnement] = await Promise.all([
        supabase.from("artisans").select("notifications_proposees_le").eq("id", artisanId).maybeSingle(),
        abonnementActuel(),
      ]);

      if (actif && !data?.notifications_proposees_le && !abonnement) {
        setMode("proposition");
      }
    }
    verifier();

    return () => {
      actif = false;
    };
  }, [artisanId, session]);

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
      if (mode === "proposition") await marquerProposee();
      setMode("cache");
    } catch (e: any) {
      setErreur(e.message || "Erreur");
      setEnCours(false);
    }
  }

  async function plusTard() {
    if (mode === "proposition") await marquerProposee();
    setMode("cache");
  }

  if (mode === "cache") return null;

  const titre = mode === "reactivation" ? "Réactive tes notifications" : "Active les notifications";
  const texte =
    mode === "reactivation"
      ? "iOS a coupé tes notifications. Réactive-les pour rester alerté dès qu'un client signe un devis ou paie une facture."
      : "Sois alerté dès qu'un client signe un devis ou paie une facture, sans avoir à ouvrir l'appli.";
  const boutonActiver = mode === "reactivation" ? "Réactiver" : "Activer les notifications";

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
        <p className="notif-propose-titre">{titre}</p>
        <p className="notif-propose-texte">{texte}</p>
        {erreur && <p className="message">{erreur}</p>}
        <div className="notif-propose-actions">
          <button type="button" className="btn btn-primary" onClick={activer} disabled={enCours}>
            {boutonActiver}
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
