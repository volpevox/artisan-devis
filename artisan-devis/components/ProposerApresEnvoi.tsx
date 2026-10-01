"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { notificationsPossibles, abonnementActuel, activerNotifications } from "@/lib/pushClient";
import { AideEcranAccueil, estSurEcranAccueil } from "./AideEcranAccueil";

interface ProposerApresEnvoiProps {
  session: Session | null;
  artisanId: string | null;
  nomClient: string;
  typeDocument: "devis" | "facture";
}

type Mode = "cache" | "ecran-accueil" | "notifications";

const CLE_ECRAN_ACCUEIL = "volpevox-ecran-accueil-propose";

function ecranAccueilDejaPropose() {
  try {
    return localStorage.getItem(CLE_ECRAN_ACCUEIL) === "oui";
  } catch {
    return false;
  }
}

function marquerEcranAccueilPropose() {
  try {
    localStorage.setItem(CLE_ECRAN_ACCUEIL, "oui");
  } catch {}
}

// Affichee juste apres l'envoi d'un devis ou d'une facture (bloc vert
// "envoi-confirme" de app/page.tsx), plutot qu'a l'arrivee dans l'appli :
// un nouvel inscrit va du profil au micro sans interruption, et on lui
// propose ces reglages au moment ou ils prennent tout leur sens.
//
// Une seule fenetre par envoi, chacune proposee une seule fois :
// 1. dans un onglet navigateur -> ajouter VolpeVox a l'ecran d'accueil
//    (sur iPhone, c'est aussi la condition pour recevoir des notifications) ;
// 2. sinon, notifications jamais proposees -> les proposer (marque en base
//    via notifications_proposees_le).
export function ProposerApresEnvoi({ session, artisanId, nomClient, typeDocument }: ProposerApresEnvoiProps) {
  const [mode, setMode] = useState<Mode>("cache");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!artisanId || !session) return;
    let actif = true;

    async function verifier() {
      if (!estSurEcranAccueil() && !ecranAccueilDejaPropose()) {
        setMode("ecran-accueil");
        return;
      }

      if (!notificationsPossibles() || Notification.permission === "denied") return;

      const [{ data }, abonnement] = await Promise.all([
        supabase.from("artisans").select("notifications_proposees_le").eq("id", artisanId).maybeSingle(),
        abonnementActuel(),
      ]);

      if (actif && !data?.notifications_proposees_le && !abonnement) {
        setMode("notifications");
      }
    }
    verifier();

    return () => {
      actif = false;
    };
  }, [artisanId, session]);

  async function marquerNotificationsProposees() {
    if (!artisanId) return;
    await supabase.from("artisans").update({ notifications_proposees_le: new Date().toISOString() }).eq("id", artisanId);
  }

  async function activer() {
    if (!session) return;
    setEnCours(true);
    setErreur("");

    try {
      await activerNotifications(session.access_token);
      await marquerNotificationsProposees();
      setMode("cache");
    } catch (e: any) {
      setErreur(e.message || "Erreur");
      setEnCours(false);
    }
  }

  async function plusTard() {
    await marquerNotificationsProposees();
    setMode("cache");
  }

  function fermerEcranAccueil() {
    marquerEcranAccueilPropose();
    setMode("cache");
  }

  if (mode === "cache") return null;

  const qui = nomClient || "ton client";
  const action = typeDocument === "facture" ? "paie" : "signe";

  // Portail directement dans <body>, voir PropositionCommentCaMarche.tsx :
  // evite que le bouton passe sous le menu du bas sur iPhone.
  return createPortal(
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
        {mode === "ecran-accueil" ? (
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
            <p className="notif-propose-titre">
              {typeDocument === "facture" ? "Ta facture est partie" : "Ton devis est parti"} chez {qui} !
            </p>
            <div style={{ marginBottom: 18 }}>
              <AideEcranAccueil />
            </div>
            <div className="notif-propose-actions">
              <button type="button" className="btn btn-primary" onClick={fermerEcranAccueil}>
                C&apos;est noté
              </button>
            </div>
          </>
        ) : (
          <>
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
            <p className="notif-propose-titre">
              Être prévenu quand {qui} {action} ?
            </p>
            <p className="notif-propose-texte">
              Active les notifications : tu seras alerté sur ton téléphone dès qu&apos;un client signe un devis ou paie
              une facture, sans ouvrir l&apos;appli.
            </p>
            {erreur && <p className="message">{erreur}</p>}
            <div className="notif-propose-actions">
              <button type="button" className="btn btn-primary" onClick={activer} disabled={enCours}>
                Oui, préviens-moi
              </button>
              <button type="button" className="btn btn-outline" onClick={plusTard} disabled={enCours}>
                Plus tard
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
