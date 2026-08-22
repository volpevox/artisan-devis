"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

export default function Home() {
  const { session, artisanId, loading } = useArtisanSession();
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
  }

  if (loading) {
    return (
      <main className="page-shell">
        <p className="message">Chargement...</p>
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
            <img src="/fox-icon.png" alt="" />
          </button>
          <span className="mic-label">{enregistrement ? "Arrêter" : "Dicter la prestation"}</span>
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
