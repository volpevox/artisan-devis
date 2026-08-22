"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [description, setDescription] = useState("");
  const [prestation, setPrestation] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [unite, setUnite] = useState("forfait");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [prixPropose, setPrixPropose] = useState(false);
  const [message, setMessage] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [devisEnregistre, setDevisEnregistre] = useState(false);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: data.texte }),
      });
      const donnees = await resStructure.json();

      if (donnees.client) setClient(donnees.client);
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

    const { data: devis, error: erreurDevis } = await supabase
      .from("devis")
      .insert({ client_nom: client, client_email: clientEmail, total })
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
      prix_unitaire: Number(prixUnitaire),
      total_ligne: total,
    });

    if (erreurLigne) {
      setMessage("Erreur : " + erreurLigne.message);
      return;
    }

    await apprendrePrix(prestation, unite, Number(prixUnitaire));

    setMessage("Devis enregistré ! Tu peux maintenant l'envoyer au client.");
    setDevisEnregistre(true);
  }

  async function envoyerAuClient() {
    setMessage("Envoi de l'email en cours...");

    const res = await fetch("/api/envoyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientEmail,
        clientNom: client,
        description,
        quantite,
        unite,
        prixUnitaire,
        prix: total,
      }),
    });
    const data = await res.json();

    if (data.erreur) {
      setMessage("Erreur d'envoi : " + data.erreur);
      return;
    }

    setMessage("Devis envoyé au client !");
    setClient("");
    setClientEmail("");
    setDescription("");
    setPrestation("");
    setQuantite("1");
    setUnite("forfait");
    setPrixUnitaire("");
    setPrixPropose(false);
    setDevisEnregistre(false);
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 400 }}>
      <Link href="/profil" style={{ display: "block", marginBottom: 15 }}>
        Mon profil →
      </Link>

      <h1>Nouveau devis</h1>

      <button
        onClick={enregistrement ? arreterMicro : demarrerMicro}
        style={{
          padding: "10px 20px",
          marginBottom: 15,
          background: enregistrement ? "red" : "#333",
          color: "white",
          border: "none",
          borderRadius: 6,
        }}
      >
        {enregistrement ? "Arrêter" : "Dicter la prestation"}
      </button>

      <input
        placeholder="Nom du client"
        value={client}
        onChange={(e) => setClient(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <input
        placeholder="Email du client"
        value={clientEmail}
        onChange={(e) => setClientEmail(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <textarea
        placeholder="Description de la prestation"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <input
        placeholder="Type de prestation (pour apprendre les prix)"
        value={prestation}
        onChange={(e) => setPrestation(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          placeholder="Quantité"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          style={{ width: "33%", padding: 8 }}
        />
        <input
          placeholder="Unité (m², heure, forfait...)"
          value={unite}
          onChange={(e) => setUnite(e.target.value)}
          style={{ width: "67%", padding: 8 }}
        />
      </div>

      <input
        placeholder="Prix unitaire (€)"
        value={prixUnitaire}
        onChange={(e) => {
          setPrixUnitaire(e.target.value);
          setPrixPropose(false);
        }}
        style={{
          display: "block",
          marginBottom: prixPropose ? 4 : 10,
          width: "100%",
          padding: 8,
          border: prixPropose ? "2px solid #2a7" : undefined,
        }}
      />
      {prixPropose && (
        <p style={{ fontSize: 12, color: "#2a7", marginTop: 0, marginBottom: 10 }}>
          Prix unitaire proposé automatiquement d'après tes anciens devis
        </p>
      )}

      <p style={{ fontWeight: "bold" }}>Total HT : {total.toFixed(2)} € (TVA ajoutée sur le devis final)</p>

      {!devisEnregistre ? (
        <button onClick={envoyer} style={{ padding: "10px 20px" }}>
          Enregistrer le devis
        </button>
      ) : (
        <button
          onClick={envoyerAuClient}
          style={{ padding: "10px 20px", background: "green", color: "white", border: "none", borderRadius: 6 }}
        >
          Envoyer au client
        </button>
      )}

      <p>{message}</p>
    </main>
  );
}
