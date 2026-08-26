"use client";
import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { PropositionNotifications } from "@/components/PropositionNotifications";
import { useArtisanSession } from "@/lib/useArtisan";

const AMPLITUDES_ONDE = [
  0.3, 0.55, 0.4, 0.8, 0.5, 1, 0.65, 0.45, 0.9, 0.35, 0.7, 0.5, 0.85, 0.4, 0.6, 1, 0.5, 0.75, 0.35, 0.9, 0.55, 0.4,
  0.7, 0.3,
];

// La valeur "Carte bancaire (en ligne)" doit rester identique a celle
// ecrite par /api/confirmer-paiement-facture lors d'un vrai paiement en
// ligne : c'est ce qui permet, cote /api/facture/[id], de savoir si le
// moyen de paiement choisi ici correspond au paiement en ligne (et donc
// d'afficher ou non le bouton "Payer en ligne" dans l'email).
const MODES_PAIEMENT_FACTURE = [
  { valeur: "Carte bancaire (en ligne)", libelle: "Paiement en ligne", enLigne: true },
  { valeur: "Virement bancaire", libelle: "Virement bancaire" },
  { valeur: "Chèque", libelle: "Chèque" },
  { valeur: "Espèces", libelle: "Espèces" },
  { valeur: "Carte bancaire", libelle: "Carte bancaire (en personne)" },
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

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

// La base attend une date ISO (AAAA-MM-JJ), mais on affiche/saisit au format
// francais JJ/MM/AAAA -- ces deux fonctions font la conversion dans les deux
// sens.
function isoVersAffichage(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function chiffresVersAffichage(chiffres: string) {
  if (chiffres.length > 4) return `${chiffres.slice(0, 2)}/${chiffres.slice(2, 4)}/${chiffres.slice(4)}`;
  if (chiffres.length > 2) return `${chiffres.slice(0, 2)}/${chiffres.slice(2)}`;
  return chiffres;
}

export default function Home() {
  const { session, artisanId, loading } = useArtisanSession();
  const [etape, setEtape] = useState<"voice" | "form">("voice");
  const [typeDocument, setTypeDocument] = useState<"devis" | "facture">("devis");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [datePrestation, setDatePrestation] = useState(dateDuJour());
  const [dateAffichage, setDateAffichage] = useState(isoVersAffichage(dateDuJour()));
  const [modePaiement, setModePaiement] = useState(MODES_PAIEMENT_FACTURE[1].valeur);
  const [paiementEnLigneDisponible, setPaiementEnLigneDisponible] = useState(false);
  const [lignes, setLignes] = useState<Ligne[]>([ligneVide()]);
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
      .select("nom_entreprise, stripe_paiement_actif")
      .eq("id", artisanId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nom_entreprise) setNomEntreprise(data.nom_entreprise);
        setPaiementEnLigneDisponible(Boolean(data?.stripe_paiement_actif));
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
      const nomDocument = typeDocument === "facture" ? "Facture" : "Devis";
      setMessage(
        auMoinsUnPrixPropose
          ? `${nomDocument} rempli automatiquement. Certains prix sont proposés d'après tes anciens devis, vérifie avant d'enregistrer.`
          : `${nomDocument} rempli automatiquement, vérifie avant d'enregistrer.`
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
    const estFacture = typeDocument === "facture";
    setMessage("Enregistrement...");
    setLienSignature("");

    const { data: numero, error: erreurNumero } = await supabase.rpc(
      estFacture ? "numero_facture_suivant" : "numero_devis_suivant",
      { p_artisan_id: artisanId }
    );

    if (erreurNumero) {
      setMessage("Erreur de numérotation : " + erreurNumero.message);
      return;
    }

    // Une facture dictee directement (sans devis ni signature prealable, pour
    // les prestations convenues a l'oral avec le client) est deja consideree
    // comme facturee des sa creation -- pas d'etape "brouillon en attente de
    // signature" comme pour un devis, elle est juste prete a etre envoyee.
    const infosDocument = estFacture
      ? {
          est_facture: true,
          numero_facture: numero,
          facture_creee_le: new Date().toISOString(),
          date_prestation: datePrestation,
          moyen_paiement: modePaiement,
          statut: "brouillon",
        }
      : { numero_devis: numero, statut: "brouillon" };

    const { data: devis, error: erreurDevis } = await supabase
      .from("devis")
      .insert({
        artisan_id: artisanId,
        client_nom: client,
        client_email: clientEmail.trim(),
        client_adresse: clientAdresse,
        total,
        ...infosDocument,
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
    setMessage(
      estFacture ? "Facture enregistrée ! Tu peux maintenant l'envoyer au client." : "Devis enregistré ! Tu peux maintenant l'envoyer au client."
    );
    setDevisEnregistre(true);
  }

  async function envoyerAuClient() {
    const estFacture = typeDocument === "facture";
    setMessage(estFacture ? "Envoi de la facture en cours..." : "Envoi de l'email en cours...");

    // Une facture reutilise directement la route qui sert deja a (re)envoyer
    // une facture transformee depuis un devis (app/api/facture/[id]) : elle
    // relit tout depuis la ligne "devis"/"lignes_devis" en base plutot que
    // depuis la requete -- contrairement a /api/envoyer (devis) qui recoit
    // les infos client et les lignes directement dans son corps. On
    // resynchronise donc d'abord la base avec l'etat courant du formulaire,
    // pour qu'une modification faite juste avant l'envoi (ex: email corrige)
    // soit bien prise en compte.
    if (estFacture) {
      await supabase
        .from("devis")
        .update({
          client_nom: client,
          client_email: clientEmail.trim(),
          client_adresse: clientAdresse,
          total,
          date_prestation: datePrestation,
          moyen_paiement: modePaiement,
        })
        .eq("id", devisId);

      await supabase.from("lignes_devis").delete().eq("devis_id", devisId);
      await supabase.from("lignes_devis").insert(
        lignes.map((l, index) => ({
          devis_id: devisId,
          ordre: index,
          description: l.description,
          quantite: Number(l.quantite),
          unite: l.unite,
          prix_unitaire: Number(l.prixUnitaire),
          total_ligne: (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0),
        }))
      );
    }

    const res = estFacture
      ? await fetch(`/api/facture/${devisId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
      : await fetch("/api/envoyer", {
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

    if (!estFacture) {
      await supabase
        .from("devis")
        .update({ statut: "envoye", envoye_le: new Date().toISOString() })
        .eq("id", devisId);
    }

    setLienSignature(`${window.location.origin}/signer/${devisId}`);
    setMessage(estFacture ? "Facture envoyée au client !" : "Devis envoyé au client !");
    setClient("");
    setClientEmail("");
    setClientAdresse("");
    setDatePrestation(dateDuJour());
    setDateAffichage(isoVersAffichage(dateDuJour()));
    setModePaiement(MODES_PAIEMENT_FACTURE[1].valeur);
    setLignes([ligneVide()]);
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

  // Choix devis/facture, visible tant que rien n'est encore enregistre en
  // base : une fois la ligne creee (devisEnregistre), le type ne doit plus
  // bouger puisque la numerotation a deja ete attribuee en consequence.
  const toggleTypeDocument = (
    <div className="type-toggle" role="tablist" aria-label="Type de document">
      <button
        type="button"
        role="tab"
        aria-selected={typeDocument === "devis"}
        className={typeDocument === "devis" ? "actif" : ""}
        onClick={() => setTypeDocument("devis")}
        disabled={devisEnregistre}
      >
        Devis
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={typeDocument === "facture"}
        className={typeDocument === "facture" ? "actif" : ""}
        onClick={() => setTypeDocument("facture")}
        disabled={devisEnregistre}
      >
        Facture
      </button>
    </div>
  );

  if (etape === "voice") {
    return (
      <main className="page-shell">
        <Topbar />
        <PropositionNotifications session={session} artisanId={artisanId} />

        <div className="voice-screen">
          <div className="voice-top">
            <p className="voice-greeting">
              <span className="voice-greeting-hand">Bonjour</span>
              {nomEntreprise ? ` ${nomEntreprise}` : ""} !
            </p>
            {toggleTypeDocument}
          </div>

          <div className="voice-middle">
            <div className="mic-wrap mic-wrap--hero">
              <span className="mic-label">
                {enregistrement
                  ? "Je vous écoute, appuyez pour arrêter"
                  : typeDocument === "facture"
                    ? "Appuyez et décrivez la prestation déjà réalisée"
                    : "Appuyez et décrivez votre prestation"}
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
            {typeDocument === "facture" ? "Remplir la facture manuellement" : "Remplir le devis manuellement"}
          </button>
        </div>

        {lienSignature && (
          <div className="card">
            <p className="hint" style={{ margin: "0 0 6px" }}>
              {typeDocument === "facture" ? "Lien de suivi (déjà inclus dans l'email) :" : "Lien de signature (déjà inclus dans l'email) :"}
            </p>
            <a href={lienSignature} style={{ fontSize: 13, wordBreak: "break-all" }}>
              {lienSignature}
            </a>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="page-shell">
      <Topbar forcerRetour onRetour={() => setEtape("voice")} />

      <h1 className="page-title">{typeDocument === "facture" ? "Nouvelle facture" : "Nouveau devis"}</h1>

      <div className="card">
        {!devisEnregistre && toggleTypeDocument}

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
        {typeDocument === "facture" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
              Date de la prestation
            </label>
            <input
              className="field"
              type="text"
              inputMode="numeric"
              placeholder="JJ/MM/AAAA"
              maxLength={10}
              style={{ marginBottom: 0 }}
              value={dateAffichage}
              onChange={(e) => {
                const chiffres = e.target.value.replace(/\D/g, "").slice(0, 8);
                setDateAffichage(chiffresVersAffichage(chiffres));
                if (chiffres.length === 8) {
                  setDatePrestation(`${chiffres.slice(4, 8)}-${chiffres.slice(2, 4)}-${chiffres.slice(0, 2)}`);
                }
              }}
            />
          </div>
        )}
        {typeDocument === "facture" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
              Mode de paiement
            </label>
            <select
              className="field"
              style={{ marginBottom: 0 }}
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
            >
              {MODES_PAIEMENT_FACTURE.filter((m) => !m.enLigne || paiementEnLigneDisponible).map((m) => (
                <option key={m.valeur} value={m.valeur}>
                  {m.libelle}
                </option>
              ))}
            </select>
            {modePaiement === MODES_PAIEMENT_FACTURE[0].valeur && (
              <p className="hint" style={{ margin: "6px 0 0" }}>
                Le mail contiendra un bouton "Payer en ligne".
              </p>
            )}
          </div>
        )}
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

        <p className="total-line">
          Total HT : {total.toFixed(2)} € (TVA ajoutée sur {typeDocument === "facture" ? "la facture finale" : "le devis final"})
        </p>

        {!devisEnregistre ? (
          <button className="btn btn-primary" onClick={envoyer}>
            {typeDocument === "facture" ? "Enregistrer la facture" : "Enregistrer le devis"}
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
            {typeDocument === "facture" ? "Lien de suivi (déjà inclus dans l'email) :" : "Lien de signature (déjà inclus dans l'email) :"}
          </p>
          <a href={lienSignature} target="_blank" rel="noreferrer" style={{ fontSize: 13, wordBreak: "break-all" }}>
            {lienSignature}
          </a>
        </div>
      )}
    </main>
  );
}
