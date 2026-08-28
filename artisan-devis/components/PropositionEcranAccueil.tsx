"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { AideEcranAccueil, estSurEcranAccueil } from "./AideEcranAccueil";

// Proposee une seule fois par artisan (colonne ecran_accueil_propose_le),
// a la premiere ouverture apres inscription -- sauf si l'appli tourne deja
// en mode "ajoutee a l'ecran d'accueil". Les instructions completes restent
// accessibles a tout moment dans Parametres > Ajouter a l'ecran d'accueil.
export function PropositionEcranAccueil({ artisanId }: { artisanId: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!artisanId || estSurEcranAccueil()) return;

    let actif = true;
    supabase
      .from("artisans")
      .select("ecran_accueil_propose_le")
      .eq("id", artisanId)
      .maybeSingle()
      .then(({ data }) => {
        if (actif && data && !data.ecran_accueil_propose_le) setVisible(true);
      });

    return () => {
      actif = false;
    };
  }, [artisanId]);

  async function fermer() {
    setVisible(false);
    if (artisanId) {
      await supabase
        .from("artisans")
        .update({ ecran_accueil_propose_le: new Date().toISOString() })
        .eq("id", artisanId);
    }
  }

  if (!visible) return null;

  // Portail dans <body>, voir PropositionNotifications.tsx (meme popup).
  return createPortal(
    <div className="notif-propose-fond">
      <div className="notif-propose-feuille">
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
          <button type="button" className="btn btn-primary" onClick={fermer}>
            J'ai compris
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
