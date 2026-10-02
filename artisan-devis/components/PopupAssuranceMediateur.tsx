"use client";
import { useState } from "react";
import type { FocusEvent } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useZoneVisible } from "@/components/PopupDatePrestation";

// Complete l'assurance pro et le mediateur depuis la dictee, sans quitter le
// devis en cours (aller sur /profil ferait perdre le devis). Enregistre
// directement dans le profil (memes colonnes que « Assurance et mediateur »).
// Portail dans <body> + zone visible : meme principe que PopupDatePrestation
// (menu du bas et clavier iPhone).

interface PopupAssuranceMediateurProps {
  artisanId: string;
  assurance: string;
  mediateur: string;
  onEnregistre: (valeurs: { assurance: string; mediateur: string }) => void;
  onFermer: () => void;
}

export function PopupAssuranceMediateur({
  artisanId,
  assurance: assuranceInitiale,
  mediateur: mediateurInitial,
  onEnregistre,
  onFermer,
}: PopupAssuranceMediateurProps) {
  const [assurance, setAssurance] = useState(assuranceInitiale);
  const [mediateur, setMediateur] = useState(mediateurInitial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const zoneVisible = useZoneVisible();

  async function enregistrer() {
    setEnCours(true);
    setErreur("");
    const valeurs = { assurance: assurance.trim(), mediateur: mediateur.trim() };
    const { error } = await supabase
      .from("artisans")
      .update({ assurance_pro: valeurs.assurance, mediateur_conso: valeurs.mediateur })
      .eq("id", artisanId);
    setEnCours(false);
    if (error) {
      setErreur("Erreur : " + error.message);
      return;
    }
    onEnregistre(valeurs);
  }

  const garderVisible = (e: FocusEvent<HTMLTextAreaElement>) => {
    const champ = e.currentTarget;
    setTimeout(() => champ.scrollIntoView({ block: "center" }), 300);
  };

  return createPortal(
    <div className="notif-propose-fond" style={zoneVisible}>
      <div className="notif-propose-feuille">
        <p className="notif-propose-titre">Assurance et médiateur</p>
        <p className="notif-propose-texte">
          Enregistrés une fois pour toutes dans ton profil, ils s&apos;afficheront sur tous tes devis et factures.
        </p>
        <div className="champ">
          <label className="champ-label" htmlFor="pop-assurance">
            Assurance professionnelle
          </label>
          <textarea
            id="pop-assurance"
            className="field"
            rows={2}
            placeholder="Ex : Assurance responsabilité civile professionnelle n° 123456 souscrite auprès de [Assureur], couvrant la France métropolitaine."
            value={assurance}
            onFocus={garderVisible}
            onChange={(e) => setAssurance(e.target.value)}
          />
        </div>
        <div className="champ" style={{ marginBottom: 20 }}>
          <label className="champ-label" htmlFor="pop-mediateur">
            Médiateur de la consommation
          </label>
          <textarea
            id="pop-mediateur"
            className="field"
            rows={2}
            placeholder="Ex : En cas de litige : [nom du médiateur] — [adresse] — [site web]."
            value={mediateur}
            onFocus={garderVisible}
            onChange={(e) => setMediateur(e.target.value)}
          />
        </div>
        {erreur && (
          <p className="message" style={{ color: "var(--danger)", marginTop: -8 }}>
            {erreur}
          </p>
        )}
        <div className="notif-propose-actions">
          <button type="button" className="btn btn-primary" disabled={enCours} onClick={enregistrer}>
            {enCours ? "Enregistrement..." : "Enregistrer"}
          </button>
          <button type="button" className="btn btn-outline" onClick={onFermer} disabled={enCours}>
            Plus tard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
