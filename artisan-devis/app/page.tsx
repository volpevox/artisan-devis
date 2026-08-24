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

interface Ligne {
  description: string;
  prestation: string;
  quantite: string;
  unite: string;
  prixUnitaire: string;
  prixPropose: boolean;
}

function ligneVide(): Ligne {
  return { description: "", prestation: "", quantite: "1", unite: "forfait", prixUnitaire: "", prixPropose: false };
}

function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const { session, artisanId, loading } = useArtisanSession();
  const [etape, setEtape] = useState<"voice" | "form">("voice");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([ligneVide()]);
  const [datePrestation, setDatePrestation] = useState(aujourdhui());
  const [message, setMessage] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [devisEnregistre, setDevisEnregistre] = useState(false);
  const [devisId, setDevisId] = useState("");
  const [lienSignature, setLienSignature] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const total = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);

  function majLigne(index: number, champ: keyof Ligne, valeur: string | boolean) {
    setLignes((ls) => ls.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  function ajouterLigne() {
    setLignes((ls) => [...ls, ligneVide()]);
  }

  function supprimerLigne(index: number) {
    setLignes((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== index) : ls));
  }

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

      const lignesRecues = Array.isArray(donnees.lignes) && donnees.lignes.length > 0 ? donnees.lignes : [{}];
      const nouvellesLignes = lignesRecues.map((l: any) => ({
        description: l.description || data.texte,
        prestation: l.prestation || "",
        quantite: String(l.quantite || 1),
        unite: l.unite || "forfait",
        prixUnitaire: l.prixUnitaire ? (Math.round(Number(l.prixUnitaire) * 100) / 100).toString() : "",
        prixPropose: Boolean(l.prixPropose),
      }));

      // Redicter depuis le formulaire ajoute a ce qui est deja rempli au
      // lieu de tout remplacer (les lignes vides deja presentes sont
      // retirees pour ne pas laisser une ligne inutile).
      if (etape === "form") {
        setLignes((ls) => {
          const conservees = ls.filter((l) => l.description.trim() || l.prixUnitaire.trim());
          return [...conservees, ...nouvellesLignes];
        });
      } else {
        setLignes(nouvellesLignes);
      }

      const auMoinsUnPrixPropose = lignesRecues.some((l: any) => l.prixPropose);
      setMessage(
        auMoinsUnPrixPropose
          ? "Devis rempli automatiquement. Certains prix sont proposés d'après tes anciens devis, vérifie avant d'enregistrer."
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
        Math.round(
          ((existant.prix_moyen * existant.nombre_utilisations + prixUnitaireNum) /
            (existant.nombre_utilisations + 1)) *
            100
        ) / 100;

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

    const { data: numeroDevis, error: erreurNumero } = await supabase.rpc("numero_devis_suivant", {
      p_artisan_id: artisanId,
    });

    if (erreurNumero) {
      setMessage("Erreur de numérotation : " + erreurNumero.message);
      return;
    }

    const { data: devis, error: erreurDevis } = await supabase
      .from("devis")
      .insert({
        artisan_id: artisanId,
        numero_devis: numeroDevis,
        client_nom: client,
        client_email: clientEmail.trim(),
        client_adresse: clientAdresse,
        date_prestation: datePrestation || null,
        total,
        statut: "brouillon",
      })
      .select()
      .single();

    if (erreurDevis) {
      setMessage("Erreur : " + erreurDevis.message);
      return;
    }

    const { error: erreurLignes } = await supabase.from("lignes_devis").insert(
      lignes.map((l, index) => ({
        devis_id: devis.id,
        ordre: index,
        description: l.description,
        quantite: Number(l.quantite),
        unite: l.unite,
        prix_unitaire: Number(l.prixUnitaire),
        total_ligne: (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0),
      }))
    );

    if (erreurLignes) {
      setMessage("Erreur : " + erreurLignes.message);
      return;
    }

    for (const l of lignes) {
      await apprendrePrix(l.prestation, l.unite, Number(l.prixUnitaire));
    }

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
        clientEmail: clientEmail.trim(),
        clientNom: client,
        clientAdresse,
        lignes: lignes.map((l) => ({
          description: l.description,
          quantite: Number(l.quantite),
          unite: l.unite,
          prixUnitaire: Number(l.prixUnitaire),
        })),
        prix: total,
        devisId,
      }),
    });
    const data = await res.json();

    if (data.erreur) {
      setMessage("Erreur d'envoi : " + data.erreur);
      return;
    }

    await supabase
      .from("devis")
      .update({ statut: "envoye", envoye_le: new Date().toISOString() })
      .eq("id", devisId);

    setLienSignature(`${window.location.origin}/signer/${devisId}`);
    setMessage("Devis envoyé au client !");
    setClient("");
    setClientEmail("");
    setClientAdresse("");
    setLignes([ligneVide()]);
    setDatePrestation(aujourdhui());
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
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mic-gold" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#f3da8f" />
          <stop offset="100%" stopColor="#c8952c" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#mic-gold)" />
      <g stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M24 38a26 26 0 0 0 0 24" />
        <path d="M76 38a26 26 0 0 1 0 24" />
      </g>
      <rect x="41" y="21" width="18" height="32" rx="9" fill="#0d1b2a" />
      <path d="M33 46a17 17 0 0 0 34 0" stroke="#0d1b2a" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <line x1="50" y1="63" x2="50" y2="72" stroke="#0d1b2a" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="40" y1="72" x2="60" y2="72" stroke="#0d1b2a" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );

  if (etape === "voice") {
    return (
      <main className="page-shell">
        <Topbar />

        <div className="voice-screen">
          <div className="voice-top">
            <p className="voice-greeting">Bonjour{nomEntreprise ? ` ${nomEntreprise}` : ""} !</p>
            <p className="voice-sub">Qu'est-ce que je peux faire pour toi ?</p>
          </div>

          <div className="voice-middle">
            <div className="mic-wrap mic-wrap--hero">
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
          </div>

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
          type="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Email du client"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value.toLowerCase())}
        />
        <input
          className="field"
          placeholder="Adresse du client"
          value={clientAdresse}
          onChange={(e) => setClientAdresse(e.target.value)}
        />
        <label className="field-label">
          Date de réalisation de la prestation
          <input
            className="field"
            style={{ marginTop: 6 }}
            type="date"
            value={datePrestation}
            onChange={(e) => setDatePrestation(e.target.value)}
          />
        </label>
        {lignes.map((ligne, index) => {
          const totalLigne = (Number(ligne.quantite) || 0) * (Number(ligne.prixUnitaire) || 0);
          return (
            <div key={index} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <textarea
                className="field"
                placeholder="Description de la prestation"
                value={ligne.description}
                onChange={(e) => majLigne(index, "description", e.target.value)}
              />
              <input
                className="field"
                placeholder="Type de prestation (pour apprendre les prix)"
                value={ligne.prestation}
                onChange={(e) => majLigne(index, "prestation", e.target.value)}
              />

              <div className="field-row">
                <input
                  className="field"
                  style={{ flex: "1 1 0%" }}
                  placeholder="Quantité"
                  value={ligne.quantite}
                  onChange={(e) => majLigne(index, "quantite", e.target.value)}
                />
                <input
                  className="field"
                  style={{ flex: "2 1 0%" }}
                  placeholder="Unité (m², heure, forfait...)"
                  value={ligne.unite}
                  onChange={(e) => majLigne(index, "unite", e.target.value)}
                />
              </div>

              <input
                className="field"
                placeholder="Prix unitaire (€)"
                value={ligne.prixUnitaire}
                onChange={(e) => {
                  majLigne(index, "prixUnitaire", e.target.value);
                  majLigne(index, "prixPropose", false);
                }}
                style={ligne.prixPropose ? { borderColor: "var(--success)", boxShadow: "0 0 0 1px var(--success)" } : undefined}
              />
              {ligne.prixPropose && (
                <p className="hint-success">Prix unitaire proposé automatiquement d'après tes anciens devis</p>
              )}

              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
                Sous-total : {totalLigne.toFixed(2)} €
              </p>

              {lignes.length > 1 && (
                <button
                  type="button"
                  onClick={() => supprimerLigne(index)}
                  style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginTop: 8 }}
                >
                  Supprimer cette ligne
                </button>
              )}
            </div>
          );
        })}

        <button type="button" className="btn btn-outline" onClick={ajouterLigne} style={{ marginBottom: 16 }}>
          + Ajouter une ligne
        </button>

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
