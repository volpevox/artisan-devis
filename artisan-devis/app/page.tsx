"use client";
import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { PropositionNotifications } from "@/components/PropositionNotifications";
import { SplashEcran } from "@/components/SplashEcran";
import { estSurEcranAccueil } from "@/components/AideEcranAccueil";
import { useArtisanSession } from "@/lib/useArtisan";

// pdf.js s'appuie sur des API navigateur : composant chargé cote client seul.
const VisionneusePdf = dynamic(() => import("@/components/VisionneusePdf").then((m) => m.VisionneusePdf), {
  ssr: false,
});

const AMPLITUDES_ONDE = [
  0.3, 0.55, 0.4, 0.8, 0.5, 1, 0.65, 0.45, 0.9, 0.35, 0.7, 0.5, 0.85, 0.4, 0.6, 1, 0.5, 0.75, 0.35, 0.9, 0.55, 0.4,
  0.7, 0.3,
];

// Ondes qui flanquent le micro dans le formulaire (4 barres de chaque cote).
const ONDES_MINI = [0.45, 0.85, 1, 0.6];

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

// La base attend une date ISO (AAAA-MM-JJ), mais on affiche/saisit au format
// francais JJ/MM/AAAA -- cette fonction fait la conversion des chiffres tapes
// vers l'affichage avec les "/".
function chiffresVersAffichage(chiffres: string) {
  if (chiffres.length > 4) return `${chiffres.slice(0, 2)}/${chiffres.slice(2, 4)}/${chiffres.slice(4)}`;
  if (chiffres.length > 2) return `${chiffres.slice(0, 2)}/${chiffres.slice(2)}`;
  return chiffres;
}

// Sur un enregistrement silencieux, Whisper renvoie soit du vide, soit une
// phrase "toute faite" qu'il invente (generique de sous-titres, "merci
// d'avoir regarde"...). On refuse ces cas plutot que d'ouvrir le formulaire
// avec un texte qui n'a jamais ete dicte.
function rienDicte(texte: string, dureeMs: number) {
  const t = (texte || "").trim().toLowerCase();
  if (!t) return true;

  const hallucinationsConnues = [
    "amara.org",
    "sous-titr",
    "soustitr",
    "sous titrage",
    "merci d'avoir regard",
    "merci d’avoir regard",
    "myfrenchfilmfestival",
    "abonnez-vous",
  ];
  if (hallucinationsConnues.some((h) => t.includes(h))) return true;

  // Texte tres court + enregistrement tres court = quasi certainement rien.
  const lettres = t.replace(/[^a-zàâäçéèêëîïôöùûüœ0-9]/gi, "");
  if (lettres.length < 8 && dureeMs < 2500) return true;

  return false;
}

export default function Home() {
  const { session, artisanId, profilArtisan, loading } = useArtisanSession();
  const [etape, setEtape] = useState<"voice" | "form">("voice");
  const [typeDocument, setTypeDocument] = useState<"devis" | "facture">("devis");
  const [client, setClient] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [datePrestation, setDatePrestation] = useState("");
  const [dateAffichage, setDateAffichage] = useState("");
  const [modePaiement, setModePaiement] = useState(MODES_PAIEMENT_FACTURE[1].valeur);
  const [lignes, setLignes] = useState<Ligne[]>([ligneVide()]);
  const [message, setMessage] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [devisEnregistre, setDevisEnregistre] = useState(false);
  const [devisId, setDevisId] = useState("");
  const [lienSignature, setLienSignature] = useState("");
  // Ecran d'accueil anime (logo + slogan) : uniquement en mode "app
  // installee" (standalone) et a chaque ouverture, y compris connecte. Dans
  // un onglet navigateur classique il n'apparait pas (evitait un flash
  // d'une demi-seconde). On part de false et on l'active apres le montage :
  // estSurEcranAccueil() a besoin de window, indisponible au rendu serveur.
  const [afficherSplash, setAfficherSplash] = useState(false);

  useEffect(() => {
    if (estSurEcranAccueil()) setAfficherSplash(true);
  }, []);
  const [apercuUrl, setApercuUrl] = useState("");
  const [apercuEnCours, setApercuEnCours] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const debutEnregistrementRef = useRef(0);

  // Infos issues du profil deja charge par useArtisanSession (plus de requete
  // a la table artisans propre a cet ecran).
  const nomEntreprise = profilArtisan?.nom_entreprise || "";
  const nomComplet = profilArtisan?.nom_complet || "";
  const paiementEnLigneDisponible = Boolean(profilArtisan?.stripe_paiement_actif);

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

      const dureeMs = Date.now() - debutEnregistrementRef.current;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setMessage("Transcription en cours...");

      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");

      const res = await fetch("/api/transcrire", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.erreur) {
        setMessage("Erreur : " + data.erreur);
        return;
      }

      if (rienDicte(data.texte, dureeMs)) {
        setMessage(
          "Je n'ai rien entendu. Appuie sur le micro et décris ta prestation à voix haute, près du téléphone."
        );
        return;
      }

      setMessage(typeDocument === "facture" ? "Analyse de la facture en cours..." : "Analyse du devis en cours...");

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
    debutEnregistrementRef.current = Date.now();
    setEnregistrement(true);
  }

  function arreterMicro() {
    mediaRecorderRef.current?.stop();
    setEnregistrement(false);
  }

  async function previsualiser() {
    setApercuEnCours(true);
    setMessage("");
    try {
      const res = await fetch("/api/apercu-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: typeDocument,
          client,
          clientAdresse,
          datePrestation: datePrestation || null,
          modePaiement,
          lignes: lignes.map((l) => ({
            description: l.description,
            quantite: l.quantite,
            unite: l.unite,
            prixUnitaire: l.prixUnitaire,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage("Aperçu impossible : " + (err.erreur || `erreur ${res.status}`));
        return;
      }

      const blob = await res.blob();
      setApercuUrl((ancien) => {
        if (ancien) URL.revokeObjectURL(ancien);
        return URL.createObjectURL(blob);
      });
    } catch {
      setMessage("Aperçu impossible : vérifie ta connexion.");
    } finally {
      setApercuEnCours(false);
    }
  }

  function fermerApercu() {
    setApercuUrl((ancien) => {
      if (ancien) URL.revokeObjectURL(ancien);
      return "";
    });
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
          date_prestation: datePrestation || null,
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
          date_prestation: datePrestation || null,
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
    setDatePrestation("");
    setDateAffichage("");
    setModePaiement(MODES_PAIEMENT_FACTURE[1].valeur);
    setLignes([ligneVide()]);
    setDevisEnregistre(false);
    setEtape("voice");
  }

  if (afficherSplash) {
    return <SplashEcran onContinuer={() => setAfficherSplash(false)} />;
  }

  if (loading) {
    return (
      <main className="page-shell">
        <p className="message">Chargement...</p>
      </main>
    );
  }

  if (apercuUrl) {
    return (
      <div className="pdf-viewer-shell">
        <Topbar forcerRetour onRetour={fermerApercu} />
        <VisionneusePdf url={apercuUrl} />
      </div>
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
              {nomEntreprise || nomComplet ? ` ${nomEntreprise || nomComplet}` : ""} !
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

      {!devisEnregistre && toggleTypeDocument}

      <div className="form-mic">
        <div className={`form-mic-onde form-mic-onde--gauche${enregistrement ? " active" : ""}`} aria-hidden="true">
          {ONDES_MINI.map((amp, i) => (
            <span key={i} style={{ "--amp": amp, animationDelay: `${i * 0.12}s` } as CSSProperties} />
          ))}
        </div>

        <button
          type="button"
          className={`form-mic-btn${enregistrement ? " recording" : ""}`}
          onClick={enregistrement ? arreterMicro : demarrerMicro}
          aria-label={enregistrement ? "Arrêter la dictée" : "Redicter la prestation"}
        >
          {iconeMicro}
        </button>

        <div className={`form-mic-onde form-mic-onde--droite${enregistrement ? " active" : ""}`} aria-hidden="true">
          {ONDES_MINI.map((amp, i) => (
            <span key={i} style={{ "--amp": amp, animationDelay: `${i * 0.12}s` } as CSSProperties} />
          ))}
        </div>
      </div>
      <p className="form-mic-label">
        {enregistrement ? "Je vous écoute, appuyez pour arrêter" : "Redicter la prestation"}
      </p>

      <div className="form-bloc">
        <p className="form-bloc-titre">Client</p>
        <div className="form-carte">
          <div className="champ">
            <label className="champ-label" htmlFor="client-nom">Nom et prénom ou raison sociale</label>
            <input
              id="client-nom"
              className="field"
              placeholder="Ex : Marie Dupont"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
          </div>
          <div className="champ">
            <label className="champ-label" htmlFor="client-email">Email du client</label>
            <input
              id="client-email"
              className="field"
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="marie.dupont@email.fr"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value.toLowerCase())}
            />
          </div>
          <div className="champ">
            <label className="champ-label" htmlFor="client-adresse">Adresse du client</label>
            <input
              id="client-adresse"
              className="field"
              placeholder="12 rue des Lilas, 75011 Paris"
              value={clientAdresse}
              onChange={(e) => setClientAdresse(e.target.value)}
            />
          </div>
        </div>
      </div>

      {typeDocument === "facture" && (
        <div className="form-bloc">
          <p className="form-bloc-titre">Détails de la facture</p>
          <div className="form-carte">
            <div className="champ">
              <label className="champ-label" htmlFor="date-presta">Date de la prestation</label>
              <input
                id="date-presta"
                className="field"
                type="text"
                inputMode="numeric"
                placeholder="JJ/MM/AAAA"
                maxLength={10}
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
            <div className="champ">
              <label className="champ-label" htmlFor="mode-paiement">Mode de paiement</label>
              <select
                id="mode-paiement"
                className="field"
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
                <p className="champ-aide">Le mail contiendra un bouton « Payer en ligne ».</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="form-bloc">
        <p className="form-bloc-titre">{typeDocument === "facture" ? "Prestations facturées" : "Prestations"}</p>
        <div className="form-carte">
          {lignes.map((ligne, index) => {
            const totalLigne = (Number(ligne.quantite) || 0) * (Number(ligne.prixUnitaire) || 0);
            return (
              <div key={index} className="ligne-presta">
                <div className="ligne-presta-tete">
                  <span className="ligne-presta-num">Ligne {index + 1}</span>
                  {lignes.length > 1 && (
                    <button
                      type="button"
                      className="ligne-presta-suppr"
                      onClick={() => supprimerLigne(index)}
                      aria-label="Supprimer cette ligne"
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12a1 1 0 0 1-1 1H8.7a1 1 0 0 1-1-1L7 7"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="champ">
                  <label className="champ-label">Description de la prestation</label>
                  <textarea
                    className="field"
                    placeholder="Ex : Peinture des murs et plafond du salon, 2 couches"
                    value={ligne.description}
                    onChange={(e) => majLigne(index, "description", e.target.value)}
                  />
                </div>

                <div className="champ">
                  <label className="champ-label">
                    Type de prestation <span style={{ fontWeight: 400 }}>— pour mémoriser tes prix</span>
                  </label>
                  <input
                    className="field"
                    placeholder="Ex : peinture murs"
                    value={ligne.prestation}
                    onChange={(e) => majLigne(index, "prestation", e.target.value)}
                  />
                </div>

                <div className="champ champ-duo">
                  <div>
                    <label className="champ-label">Quantité</label>
                    <input
                      className="field"
                      inputMode="decimal"
                      placeholder="1"
                      value={ligne.quantite}
                      onChange={(e) => majLigne(index, "quantite", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="champ-label">Unité</label>
                    <input
                      className="field"
                      placeholder="m², heure, forfait..."
                      value={ligne.unite}
                      onChange={(e) => majLigne(index, "unite", e.target.value)}
                    />
                  </div>
                </div>

                <div className="champ">
                  <label className="champ-label">Prix unitaire (€)</label>
                  <input
                    className="field"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={ligne.prixUnitaire}
                    onChange={(e) => {
                      majLigne(index, "prixUnitaire", e.target.value);
                      majLigne(index, "prixPropose", false);
                    }}
                    style={
                      ligne.prixPropose
                        ? { borderColor: "var(--success)", boxShadow: "0 0 0 1px var(--success)" }
                        : undefined
                    }
                  />
                  {ligne.prixPropose && (
                    <p className="hint-success" style={{ margin: "6px 0 0" }}>
                      Prix proposé automatiquement d'après tes anciens devis
                    </p>
                  )}
                </div>

                <div className="ligne-presta-soustotal">
                  <span>Sous-total</span>
                  <strong>{totalLigne.toFixed(2)} €</strong>
                </div>
              </div>
            );
          })}

          <button type="button" className="btn btn-outline btn-bloc" onClick={ajouterLigne}>
            + Ajouter une ligne
          </button>
        </div>
      </div>

      <div className="form-bloc">
        <div className="total-bloc">
          <span className="total-bloc-label">
            Total HT
            <br />
            <span style={{ fontSize: 11.5 }}>
              TVA ajoutée sur {typeDocument === "facture" ? "la facture" : "le devis"} final
            </span>
          </span>
          <span className="total-bloc-montant">{total.toFixed(2)} €</span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-bloc"
          onClick={previsualiser}
          disabled={apercuEnCours}
          style={{ marginBottom: 8 }}
        >
          {apercuEnCours ? "Génération de l'aperçu..." : "Prévisualiser en PDF"}
        </button>

        {!devisEnregistre ? (
          <button className="btn btn-primary btn-bloc" onClick={envoyer}>
            {typeDocument === "facture" ? "Enregistrer la facture" : "Enregistrer le devis"}
          </button>
        ) : (
          <button className="btn btn-success btn-bloc" onClick={envoyerAuClient}>
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
