"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [description, setDescription] = useState("");
  const [prix, setPrix] = useState("");
  const [message, setMessage] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [devisEnregistre, setDevisEnregistre] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      if (donnees.prix) setPrix(String(donnees.prix));

      setMessage("Devis rempli automatiquement, vérifie avant d'enregistrer.");
    };

    recorder.start();
    setEnregistrement(true);
  }

  function arreterMicro() {
    mediaRecorderRef.current?.stop();
    setEnregistrement(false);
  }

  async function envoyer() {
    setMessage("Enregistrement...");

    const { data: devis, error: erreurDevis } = await supabase
      .from("devis")
      .insert({ client_nom: client, client_email: clientEmail, total: Number(prix) })
      .select()
      .single();

    if (erreurDevis) {
      setMessage("Erreur : " + erreurDevis.message);
      return;
    }

    const { error: erreurLigne } = await supabase.from("lignes_devis").insert({
      devis_id: devis.id,
      description: description,
      quantite: 1,
      prix_unitaire: Number(prix),
      total_ligne: Number(prix),
    });

    if (erreurLigne) {
      setMessage("Erreur : " + erreurLigne.message);
      return;
    }

    setMessage("Devis enregistré ! Tu peux maintenant l'envoyer au client.");
    setDevisEnregistre(true);
  }

  async function envoyerAuClient() {
    setMessage("Envoi de l'email en cours...");

    const res = await fetch("/api/envoyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientEmail, clientNom: client, description, prix }),
    });
    const data = await res.json();

    if (data.erreur) {
      setMessage("Erreur d'envoi : " + data.erreur);
      return;
    }

    setMessage("Devis envoyé au client !");