"use client";
import { useEffect, useState } from "react";
import type { CSSProperties, FocusEvent } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useZoneVisible } from "@/components/PopupDatePrestation";
import { moyensAcceptes } from "@/lib/moyensPaiement";

// Rappel non bloquant avant l'envoi d'une facture : l'artisan accepte le
// virement (profil > Paiement) mais n'a pas rempli son IBAN, le client ne
// verrait que « repondez a ce mail pour recevoir les coordonnees ».
// « L'ajouter » ouvre une petite fenetre (IBAN, BIC, titulaire) qui
// enregistre dans le profil sans quitter la page. Meme principe que
// PopupAssuranceMediateur (portail + zone visible pour le clavier iPhone).

export function RappelIban({
  profil,
  artisanId,
  style,
}: {
  profil: any;
  artisanId: string | null;
  style?: CSSProperties;
}) {
  const [ibanEnregistre, setIbanEnregistre] = useState("");
  const [popup, setPopup] = useState(false);

  useEffect(() => {
    if (profil?.iban) setIbanEnregistre(profil.iban);
  }, [profil]);

  if (!profil || !artisanId) return null;
  if (!moyensAcceptes(profil.moyens_paiement).includes("virement")) return null;
  if (ibanEnregistre.trim()) return null;

  return (
    <>
      <div className="rappel-mentions" style={style}>
        <span>Tu acceptes le virement, mais ton IBAN n&apos;est pas rempli : ton client ne pourra pas te payer directement.</span>
        <button type="button" onClick={() => setPopup(true)}>
          L&apos;ajouter →
        </button>
      </div>
      {popup && (
        <PopupIban
          artisanId={artisanId}
          titulaireParDefaut={profil.titulaire_compte || profil.nom_complet || ""}
          onEnregistre={(iban) => {
            setIbanEnregistre(iban);
            setPopup(false);
          }}
          onFermer={() => setPopup(false)}
        />
      )}
    </>
  );
}

function PopupIban({
  artisanId,
  titulaireParDefaut,
  onEnregistre,
  onFermer,
}: {
  artisanId: string;
  titulaireParDefaut: string;
  onEnregistre: (iban: string) => void;
  onFermer: () => void;
}) {
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [titulaire, setTitulaire] = useState(titulaireParDefaut);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const zoneVisible = useZoneVisible();
  const ibanPropre = iban.replace(/\s+/g, "").toUpperCase();

  async function enregistrer() {
    setEnCours(true);
    setErreur("");
    const { error } = await supabase
      .from("artisans")
      .update({
        iban: ibanPropre,
        bic: bic.replace(/\s+/g, "").toUpperCase() || null,
        titulaire_compte: titulaire.trim() || null,
      })
      .eq("id", artisanId);
    setEnCours(false);
    if (error) {
      setErreur("Erreur : " + error.message);
      return;
    }
    onEnregistre(ibanPropre);
  }

  const garderVisible = (e: FocusEvent<HTMLInputElement>) => {
    const champ = e.currentTarget;
    setTimeout(() => champ.scrollIntoView({ block: "center" }), 300);
  };

  return createPortal(
    <div className="notif-propose-fond" style={zoneVisible}>
      <div className="notif-propose-feuille">
        <p className="notif-propose-titre">Tes coordonnées bancaires</p>
        <p className="notif-propose-texte">
          Elles sont sur ton RIB (application de ta banque). Enregistrées dans ton profil, elles s&apos;afficheront sur
          toutes tes factures.
        </p>
        <div className="champ">
          <label className="champ-label" htmlFor="pop-iban">IBAN</label>
          <input
            id="pop-iban"
            className="field"
            autoCapitalize="characters"
            autoCorrect="off"
            placeholder="FR76 1234 5678 9012 3456 7890 123"
            value={iban}
            onFocus={garderVisible}
            onChange={(e) => setIban(e.target.value)}
          />
        </div>
        <div className="champ champ-duo" style={{ marginBottom: 20 }}>
          <div>
            <label className="champ-label" htmlFor="pop-bic">BIC</label>
            <input
              id="pop-bic"
              className="field"
              autoCapitalize="characters"
              autoCorrect="off"
              placeholder="BNPAFRPPXXX"
              value={bic}
              onFocus={garderVisible}
              onChange={(e) => setBic(e.target.value)}
            />
          </div>
          <div>
            <label className="champ-label" htmlFor="pop-titulaire">Titulaire</label>
            <input
              id="pop-titulaire"
              className="field"
              value={titulaire}
              onFocus={garderVisible}
              onChange={(e) => setTitulaire(e.target.value)}
            />
          </div>
        </div>
        {erreur && (
          <p className="message" style={{ color: "var(--danger)", marginTop: -8 }}>
            {erreur}
          </p>
        )}
        <div className="notif-propose-actions">
          <button type="button" className="btn btn-primary" disabled={enCours || ibanPropre.length < 14} onClick={enregistrer}>
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
