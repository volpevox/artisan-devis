"use client";
import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

const AMPLITUDES_ONDE = [
  0.3, 0.55, 0.4, 0.8, 0.5, 1, 0.65, 0.45, 0.9, 0.35, 0.7, 0.5, 0.85, 0.4, 0.6, 1, 0.5, 0.75, 0.35, 0.9, 0.55, 0.4,
  0.7, 0.3,
];

export default function Home() {
  const { session, artisanId, loading } = useArtisanSession();
  const [etape, setEtape] = useState<"voice" | "form">("voice");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [description, setDescription] = useState("");
  const [prestation, setPrestation] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [unite, setUnite] = useState("forfait");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [prixPropose, setPrixPropose] = useState(false);
  const [message, setMessage] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [devisEnregistre, setDevisEnregistre] = useState(false);
  const [devisId, setDevisId] = useState("");
  const [lienSignature, setLienSignature] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const total = (Number(quantite) || 0) * (Number(prixUnitaire) || 0);

  useEffect(() => {
    if (!artisanId) return;
    supabase
      .from("artisans")
      .select("nom_entreprise")
      .eq("id", artisanId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nom_entreprise) setNomEntreprise(data.nom_entreprise);
      });
  }, [artisanId]);

  async function demarrerMicro() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setMessage("Transcription en cours...");

      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");

      const res = await fetch("/api/transcrire", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.erreur) {
        setMessage("Erreur : " + data.erreur);
        return;
      }

      setMessage("Analyse du devis en cours...");

      const resStructure = await fetch("/api/structurer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ texte: data.texte }),
      });
      const donnees = await resStructure.json();

      if (donnees.client) setClient(donnees.client);
      if (donnees.clientAdresse) setClientAdresse(donnees.clientAdresse);
      setDescription(donnees.description || data.texte);
      setPrestation(donnees.prestation || "");
      setQuantite(String(donnees.quantite || 1));
      setUnite(donnees.unite || "forfait");
      if (donnees.prixUnitaire) setPrixUnitaire(String(donnees.prixUnitaire));
      setPrixPropose(Boolean(donnees.prixPropose));

      setMessage(
        donnees.prixPropose
          ? "Devis rempli automatiquement. Prix unitaire proposé d'après tes anciens devis, vérifie avant d'enregistrer."
          : "Devis rempli automatiquement, vérifie avant d'enregistrer."
      );
      setEtape("form");
    };

    recorder.start();
    setEnregistrement(true);
  }

  function arreterMicro() {
    mediaRecorderRef.current?.stop();
    setEnregistrement(false);
  }

  async function apprendrePrix(prestationSaisie: string, uniteSaisie: string, prixUnitaireNum: number) {
    if (!prestationSaisie.trim() || !prixUnitaireNum) return;

    const { data: existant } = await supabase
      .from("prix_appris")
      .select("*")
      .eq("artisan_id", artisanId)
      .ilike("prestation", prestationSaisie.trim())
      .eq("unite", uniteSaisie)
      .maybeSingle();

    if (existant) {
      const nouvelleMoyenne =
        (existant.prix_moyen * existant.nombre_utilisations + prixUnitaireNum) /
        (existant.nombre_utilisations + 1);

      await supabase
        .from("prix_appris")
        .update({
          prix_moyen: nouvelleMoyenne,
          nombre_utilisations: existant.nombre_utilisations + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existant.id);
    } else {
      await supabase.from("prix_appris").insert({
        artisan_id: artisanId,
        prestation: prestationSaisie.trim(),
        unite: uniteSaisie,
        prix_moyen: prixUnitaireNum,
        nombre_utilisations: 1,
        updated_at: new Date().toISOString(),
      });
    }
  }

  async function envoyer() {
    setMessage("Enregistrement...");
    setLienSignature("");

    const { data: devis, error: erreurDevis } = await supabase
      .from("devis")
      .insert({
        artisan_id: artisanId,
        client_nom: client,
        client_email: clientEmail,
        client_adresse: clientAdresse,
        total,
        statut: "brouillon",
      })
      .select()
      .single();

    if (erreurDevis) {
      setMessage("Erreur : " + erreurDevis.message);
      return;
    }

    const { error: erreurLigne } = await supabase.from("lignes_devis").insert({
      devis_id: devis.id,
      description: description,
      quantite: Number(quantite),
      unite,
      prix_unitaire: Number(prixUnitaire),
      total_ligne: total,
    });

    if (erreurLigne) {
      setMessage("Erreur : " + erreurLigne.message);
      return;
    }

    await apprendrePrix(prestation, unite, Number(prixUnitaire));

    setDevisId(devis.id);
    setMessage("Devis enregistré ! Tu peux maintenant l'envoyer au client.");
    setDevisEnregistre(true);
  }

  async function envoyerAuClient() {
    setMessage("Envoi de l'email en cours...");

    const res = await fetch("/api/envoyer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        clientEmail,
        clientNom: client,
        clientAdresse,
        description,
        quantite,
        unite,
        prixUnitaire,
        prix: total,
        devisId,
      }),
    });
    const data = await res.json();

    if (data.erreur) {
      setMessage("Erreur d'envoi : " + data.erreur);
      return;
    }

    await supabase.from("devis").update({ statut: "envoye" }).eq("id", devisId);

    setLienSignature(`${window.location.origin}/signer/${devisId}`);
    setMessage("Devis envoyé au client !");
    setClient("");
    setClientEmail("");
    setClientAdresse("");
    setDescription("");
    setPrestation("");
    setQuantite("1");
    setUnite("forfait");
    setPrixUnitaire("");
    setPrixPropose(false);
    setDevisEnregistre(false);
    setEtape("voice");
  }

  if (loading) {
    return (
      <main className="page-shell">
        <p className="message">Chargement...</p>
      </main>
    );
  }

  const iconeMicro = (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 0 0-7 0v5A3.5 3.5 0 0 0 12 15Z"
        stroke="var(--on-ink)"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5M9 20.5h6"
        stroke="var(--on-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );

  if (etape === "voice") {
    return (
      <main className="page-shell">
        <Topbar />

        <div className="voice-screen">
          <p className="voice-greeting">Bonjour{nomEntreprise ? ` ${nomEntreprise}` : ""} !</p>
          <p className="voice-sub">Que souhaitez-vous créer aujourd'hui ?</p>

          <div className="mic-wrap">
            <span className="mic-label">
              {enregistrement ? "Je vous écoute, appuyez pour arrêter" : "Appuyez et décrivez votre prestation"}
            </span>

            <button
              className={`mic-button mic-button--hero${enregistrement ? " recording" : ""}`}
              onClick={enregistrement ? arreterMicro : demarrerMicro}
              aria-label={enregistrement ? "Arrêter la dictée" : "Dicter la prestation"}
            >
              {iconeMicro}
            </button>
          </div>

          <div className={`voice-wave${enregistrement ? " active" : ""}`} aria-hidden="true">
            {AMPLITUDES_ONDE.map((amp, i) => (
              <span key={i} style={{ "--amp": amp, animationDelay: `${(i % 8) * 0.09}s` } as CSSProperties} />
            ))}
          </div>

          {message && <p className="message">{message}</p>}

          <button className="voice-skip" onClick={() => setEtape("form")}>
            Remplir le devis manuellement
          </button>
        </div>

        {lienSignature && (
          <div className="card">
            <p className="hint" style={{ margin: "0 0 6px" }}>
              Lien de signature (déjà inclus dans l'email) :
            </p>
            <a href={lienSignature} target="_blank" rel="noreferrer" style={{ fontSize: 13, wordBreak: "break-all" }}>
              {lienSignature}
            </a>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Nouveau devis</h1>

      <div className="card">
        <div className="mic-wrap">
          <button
            className={`mic-button${enregistrement ? " recording" : ""}`}
            onClick={enregistrement ? arreterMicro : demarrerMicro}
            aria-label={enregistrement ? "Arrêter la dictée" : "Dicter la prestation"}
          >
            {iconeMicro}
          </button>
          <span className="mic-label">{enregistrement ? "Arrêter" : "Redicter la prestation"}</span>
        </div>

        <input
          className="field"
          placeholder="Nom et prénom ou raison sociale"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />
        <input
          className="field"
          placeholder="Email du client"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
        />
        <input
          className="field"
          placeholder="Adresse du client"
          value={clientAdresse}
          onChange={(e) => setClientAdresse(e.target.value)}
        />
        <textarea
          className="field"
          placeholder="Description de la prestation"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="field"
          placeholder="Type de prestation (pour apprendre les prix)"
          value={prestation}
          onChange={(e) => setPrestation(e.target.value)}
        />

        <div className="field-row">
          <input
            className="field"
            style={{ flex: "1 1 0%" }}
            placeholder="Quantité"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
          />
          <input
            className="field"
            style={{ flex: "2 1 0%" }}
            placeholder="Unité (m², heure, forfait...)"
            value={unite}
            onChange={(e) => setUnite(e.target.value)}
          />
        </div>

        <input
          className="field"
          placeholder="Prix unitaire (€)"
          value={prixUnitaire}
          onChange={(e) => {
            setPrixUnitaire(e.target.value);
            setPrixPropose(false);
          }}
          style={prixPropose ? { borderColor: "var(--success)", boxShadow: "0 0 0 1px var(--success)" } : undefined}
        />
        {prixPropose && (
          <p className="hint-success">Prix unitaire proposé automatiquement d'après tes anciens devis</p>
        )}

        <p className="total-line">Total HT : {total.toFixed(2)} € (TVA ajoutée sur le devis final)</p>

        {!devisEnregistre ? (
          <button className="btn btn-primary" onClick={envoyer}>
            Enregistrer le devis
          </button>
        ) : (
          <button className="btn btn-success" onClick={envoyerAuClient}>
            Envoyer au client
          </button>
        )}

        {message && <p className="message">{message}</p>}
      </div>

      {lienSignature && (
        <div className="card">
          <p className="hint" style={{ margin: "0 0 6px" }}>
            Lien de signature (déjà inclus dans l'email) :
          </p>
          <a href={lienSignature} target="_blank" rel="noreferrer" style={{ fontSize: 13, wordBreak: "break-all" }}>
            {lienSignature}
          </a>
        </div>
      )}
    </main>
  );
}
