"use client";
import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { PropositionNotifications } from "@/components/PropositionNotifications";
import { ProposerApresEnvoi } from "@/components/ProposerApresEnvoi";
import { prenomDepuisNomComplet } from "@/lib/prenom";
import { BanniereRodage } from "@/components/BanniereRodage";
import { SplashEcran } from "@/components/SplashEcran";
import { estSurEcranAccueil } from "@/components/AideEcranAccueil";
import { useArtisanSession } from "@/lib/useArtisan";
import { UNITES } from "@/lib/unites";
import { enNombre } from "@/lib/nombre";
import { normaliserSiren } from "@/lib/siren";
import { PopupAssuranceMediateur } from "@/components/PopupAssuranceMediateur";
import { RappelIban } from "@/components/RappelIban";
import { PopupProfilIncomplet } from "@/components/PopupProfilIncomplet";

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
  // Prix absent apres la dictee : le resume affiche une case pour le saisir
  // (fige a la dictee, pour que la case ne disparaisse pas pendant la frappe).
  prixManquant?: boolean;
}

// Montant a la francaise pour le resume : 1 234,50 €
function euros(n: number) {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
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
const MESSAGE_RIEN_ENTENDU =
  "Je n'ai rien entendu. Appuie sur le micro et décris ta prestation à voix haute, près du téléphone.";


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
  // Apres une dictee : resume compact (client, lignes, total) au lieu du
  // formulaire complet, qui reste accessible via « Modifier les détails ».
  const [vueResume, setVueResume] = useState(false);
  // Ligne du resume ouverte pour modification (une seule a la fois).
  const [ligneOuverte, setLigneOuverte] = useState<number | null>(null);
  const [typeDocument, setTypeDocument] = useState<"devis" | "facture">("devis");
  const [clientPrenom, setClientPrenom] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientRaisonSociale, setClientRaisonSociale] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientTelephone, setClientTelephone] = useState("");
  const [clientSiren, setClientSiren] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  // Particulier / professionnel : decide des cases affichees (entreprise,
  // SIREN) et, sur le PDF, des mentions legales a ajouter.
  const [clientType, setClientType] = useState<"particulier" | "professionnel">("particulier");
  // Adresse de la prestation, seulement si differente de celle du client.
  const [adressePrestation, setAdressePrestation] = useState("");
  const [adressePrestationOuverte, setAdressePrestationOuverte] = useState(false);
  // Devis : date de debut et duree estimee (texte libre, tel que dicte).
  const [debutPrestation, setDebutPrestation] = useState("");
  const [dureePrestation, setDureePrestation] = useState("");
  // Cases « À compléter » du resume : une case vide y entre et y reste
  // (sinon elle disparaitrait des la premiere lettre tapee).
  const [casesDemandees, setCasesDemandees] = useState<string[]>([]);
  const [datePrestation, setDatePrestation] = useState("");
  const [dateAffichage, setDateAffichage] = useState("");
  const [modePaiement, setModePaiement] = useState(MODES_PAIEMENT_FACTURE[1].valeur);
  const [lignes, setLignes] = useState<Ligne[]>([ligneVide()]);
  const [message, setMessage] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  // Entre l appui sur le micro et le moment ou le telephone l ouvre vraiment
  // (souvent 0,5 a 1 s sur iPhone) : le bouton reagit tout de suite.
  const [micPreparation, setMicPreparation] = useState(false);
  const [devisEnregistre, setDevisEnregistre] = useState(false);
  const [devisId, setDevisId] = useState("");
  // Enregistrement / envoi en cours : boutons bloques (pas de double envoi).
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Devis existant ouvert via « Modifier » (/?modifier=ID) : numero garde,
  // statut d'origine (brouillon / envoye). null = nouveau document.
  const [modification, setModification] = useState<{ numero: number | null; statut: string } | null>(null);
  const [lienSignature, setLienSignature] = useState("");
  const [envoiConfirme, setEnvoiConfirme] = useState<{ email: string; nom: string } | null>(null);
  // Ecran d'accueil anime (logo + slogan) : uniquement en mode "app
  // installee" (standalone), et UNE SEULE FOIS par session (au lancement de
  // l'appli), pas a chaque retour sur la page dictee via le menu du bas. Dans
  // un onglet navigateur classique il n'apparait pas (evitait un flash
  // d'une demi-seconde). On part de false et on l'active apres le montage :
  // estSurEcranAccueil() a besoin de window, indisponible au rendu serveur.
  const [afficherSplash, setAfficherSplash] = useState(false);

  useEffect(() => {
    if (!estSurEcranAccueil()) return;
    try {
      // sessionStorage est vide au vrai lancement de l'appli et persiste
      // pendant toute la navigation interne -> le splash s'affiche une fois
      // par ouverture, jamais en boucle quand on revient sur "/".
      if (sessionStorage.getItem("splash_vu")) return;
      sessionStorage.setItem("splash_vu", "1");
    } catch {
      // sessionStorage indisponible (navigation privee, etc.) : on montre le
      // splash quand meme, quitte a ce qu'il reapparaisse a la navigation.
    }
    setAfficherSplash(true);
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
  // Salutation : le prenom de la personne si connu, sinon l'entreprise.
  // Salutation : le nom de la societe pour une societe, sinon le prenom.
  const nomSalutation =
    (profilArtisan?.est_societe === true && nomEntreprise) ||
    profilArtisan?.prenom?.trim() ||
    prenomDepuisNomComplet(profilArtisan?.nom_complet || "") ||
    nomEntreprise;
  const paiementEnLigneDisponible = Boolean(profilArtisan?.stripe_paiement_actif);

  // Assurance pro et mediateur (profil) : rappel non bloquant avant l'envoi a
  // un particulier s'il en manque un. Copie locale, mise a jour par la popup
  // pour que le rappel disparaisse sans recharger le profil.
  const [mentionsProfil, setMentionsProfil] = useState<{ assurance: string; mediateur: string } | null>(null);
  const [popupMentions, setPopupMentions] = useState(false);
  useEffect(() => {
    if (profilArtisan && mentionsProfil === null) {
      setMentionsProfil({
        assurance: profilArtisan.assurance_pro || "",
        mediateur: profilArtisan.mediateur_conso || "",
      });
    }
  }, [profilArtisan, mentionsProfil]);
  // « Ton devis est presque pret » : une seule fois par compte, au premier
  // apercu ou envoi d'un devis, s'il manque assurance, mediateur ou logo.
  // Ref (et pas seulement un etat) pour que l'action relancee juste apres
  // « Plus tard » ne rouvre pas la fenetre.
  const popupProfilVue = useRef(false);
  // Copie en etat pour reafficher le petit rappel des que la fenetre est vue.
  const [popupProfilDejaVue, setPopupProfilDejaVue] = useState(false);
  const [popupProfil, setPopupProfil] = useState<null | "apercu" | "envoi">(null);
  const [popupProfilEnCours, setPopupProfilEnCours] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (profilArtisan?.popup_profil_vue_le) {
      popupProfilVue.current = true;
      setPopupProfilDejaVue(true);
    }
  }, [profilArtisan]);
  const profilAManque = Boolean(
    mentionsProfil &&
      (!mentionsProfil.assurance.trim() || !mentionsProfil.mediateur.trim() || !profilArtisan?.logo_url)
  );
  // Renvoie true si la fenetre s'ouvre (l'action attend alors la reponse).
  function proposerProfil(action: "apercu" | "envoi") {
    if (typeDocument !== "devis" || popupProfilVue.current || !profilAManque) return false;
    setPopupProfil(action);
    return true;
  }
  // « Completer maintenant » : le devis est d'abord enregistre en brouillon
  // (sinon il serait perdu en quittant la page), puis Mon compte s'ouvre sur
  // les rubriques qui manquent et ramene ici (?modifier=ID) apres Enregistrer.
  async function popupProfilCompleter() {
    setPopupProfilEnCours(true);
    const id = devisEnregistre ? ((await synchroniser(devisId)) ? devisId : null) : await enregistrer();
    if (!id) {
      setPopupProfilEnCours(false);
      setPopupProfil(null);
      return;
    }
    popupProfilVue.current = true;
    setPopupProfilDejaVue(true);
    if (artisanId) {
      await supabase.from("artisans").update({ popup_profil_vue_le: new Date().toISOString() }).eq("id", artisanId);
    }
    const aCompleter = [
      mentionsProfil && (!mentionsProfil.assurance.trim() || !mentionsProfil.mediateur.trim()) ? "mentions" : "",
      !profilArtisan?.logo_url ? "logo" : "",
    ].filter(Boolean);
    router.push(`/profil?completer=${aCompleter.join(",")}&retour=${encodeURIComponent(`/?modifier=${id}`)}`);
  }

  async function popupProfilPlusTard() {
    const action = popupProfil;
    popupProfilVue.current = true;
    setPopupProfilDejaVue(true);
    setPopupProfil(null);
    if (artisanId) {
      await supabase.from("artisans").update({ popup_profil_vue_le: new Date().toISOString() }).eq("id", artisanId);
    }
    if (action === "apercu") previsualiser();
    if (action === "envoi") envoyerDirect();
  }

  const mentionsManquantes = mentionsProfil
    ? [!mentionsProfil.assurance.trim() && "ton assurance pro", !mentionsProfil.mediateur.trim() && "ton médiateur"].filter(
        Boolean
      )
    : [];

  const total = lignes.reduce((s, l) => s + (enNombre(l.quantite) || 0) * (enNombre(l.prixUnitaire) || 0), 0);

  // Nom affiche sur le document et dans les emails : le nom de l'entreprise
  // prime (client professionnel), sinon "Prenom Nom". Un seul champ client_nom est
  // stocke en base -- pas de colonne prenom/raison sociale separee, pour rester
  // simple et ne rien casser cote PDF/emails/cartes qui lisent deja client_nom.
  const estPro = clientType === "professionnel";
  const nomClientAffiche = (
    (estPro && clientRaisonSociale.trim()) || [clientPrenom.trim(), clientNom.trim()].filter(Boolean).join(" ")
  ).trim();

  // SIREN du client : demande seulement pour un client professionnel.
  // Obligatoire sur les factures entre pros avec la
  // reforme de la facturation electronique.
  const sirenSaisi = estPro ? normaliserSiren(clientSiren) : null;
  const sirenClient = sirenSaisi === "invalide" ? null : sirenSaisi;

  // Resume : on ne demande que ce qui manque. Adresse du client toujours
  // (seule case qui bloque l'envoi) ; nom de l'entreprise pour un pro ;
  // SIREN pour une facture a un pro.
  useEffect(() => {
    if (!vueResume) return;
    const vides: string[] = [];
    if (!clientAdresse.trim()) vides.push("adresse");
    if (estPro && !clientRaisonSociale.trim()) vides.push("entreprise");
    if (estPro && typeDocument === "facture" && !clientSiren.trim()) vides.push("siren");
    if (vides.length > 0) setCasesDemandees((c) => Array.from(new Set([...c, ...vides])));
  }, [vueResume, clientAdresse, estPro, clientRaisonSociale, clientSiren, typeDocument]);
  const caseDemandee = (nom: string) =>
    casesDemandees.includes(nom) &&
    (nom === "adresse" || (estPro && (nom === "entreprise" || typeDocument === "facture")));

  function majLigne(index: number, champ: keyof Ligne, valeur: string | boolean) {
    setLignes((ls) => ls.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  // Repasser une ligne en forfait remet la quantite a 1 : la case quantite
  // est cachee en forfait, elle ne doit pas multiplier le prix en douce.
  function changerUnite(index: number, unite: string) {
    setLignes((ls) =>
      ls.map((l, i) => (i === index ? { ...l, unite, quantite: unite === "forfait" ? "1" : l.quantite } : l))
    );
  }

  // Resume : ouvrir une ligne referme la precedente (en la validant).
  function ouvrirLigne(index: number) {
    if (ligneOuverte !== null) fermerLigne(ligneOuverte);
    setLigneOuverte(index);
  }

  // A la fermeture, la case « Prix » du resume ne reste que si le prix est
  // toujours vide.
  function fermerLigne(index: number) {
    setLignes((ls) => ls.map((l, i) => (i === index ? { ...l, prixManquant: !enNombre(l.prixUnitaire) } : l)));
    setLigneOuverte(null);
  }

  function ajouterLigne() {
    setLignes((ls) => [...ls, ligneVide()]);
  }

  function supprimerLigne(index: number) {
    setLignes((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== index) : ls));
  }

  async function demarrerMicro() {
    // Double appui pendant l ouverture du micro : on ignore.
    if (micPreparation || enregistrement) return;
    setMicPreparation(true);
    setMessage("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicPreparation(false);
      setMessage("Micro inaccessible. Autorise le micro pour VolpeVox dans les réglages de ton téléphone, puis réessaie.");
      return;
    }
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
        setMessage(MESSAGE_RIEN_ENTENDU);
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

      if (donnees.clientPrenom) setClientPrenom(donnees.clientPrenom);
      if (donnees.clientNom) setClientNom(donnees.clientNom);
      if (donnees.clientRaisonSociale) {
        setClientRaisonSociale(donnees.clientRaisonSociale);
        setClientType("professionnel");
      }
      if (donnees.clientTelephone) setClientTelephone(donnees.clientTelephone);
      if (donnees.clientAdresse) setClientAdresse(donnees.clientAdresse);
      if (donnees.clientType === "professionnel") setClientType("professionnel");
      if (donnees.debutPrestation) setDebutPrestation(String(donnees.debutPrestation));
      if (donnees.dureePrestation) setDureePrestation(String(donnees.dureePrestation));
      if (donnees.clientSiren) setClientSiren(String(donnees.clientSiren));
      const lieu = String(donnees.adressePrestation || "").trim();
      if (lieu && lieu.toLowerCase() !== String(donnees.clientAdresse || "").trim().toLowerCase()) {
        setAdressePrestation(lieu);
        setAdressePrestationOuverte(true);
      }
      if (donnees.clientEmail) setClientEmail(String(donnees.clientEmail).toLowerCase().replace(/\s/g, ""));

      // Client deja connu (meme nom qu'un ancien devis/facture) : on reprend
      // ses coordonnees pour les cases que la dictee a laissees vides.
      const nomDicte = (
        (donnees.clientRaisonSociale || "").trim() ||
        [donnees.clientPrenom, donnees.clientNom].map((x: string) => (x || "").trim()).filter(Boolean).join(" ")
      ).trim();
      let clientConnu = false;
      if (nomDicte && artisanId) {
        const { data: anciens } = await supabase
          .from("devis")
          .select("client_email, client_telephone, client_adresse, client_siren, client_type")
          .eq("artisan_id", artisanId)
          .ilike("client_nom", nomDicte.replace(/[%_\\]/g, (c: string) => `\\${c}`))
          .order("created_at", { ascending: false })
          .limit(1);
        const ancien = anciens?.[0];
        if (ancien) {
          clientConnu = Boolean(ancien.client_email || ancien.client_telephone || ancien.client_adresse);
          if (ancien.client_email) setClientEmail((a) => a || ancien.client_email);
          if (ancien.client_telephone) setClientTelephone((a) => a || ancien.client_telephone);
          if (ancien.client_adresse) setClientAdresse((a) => a || ancien.client_adresse);
          if (ancien.client_siren) setClientSiren((a) => a || ancien.client_siren);
          if (ancien.client_type === "professionnel" || ancien.client_siren) setClientType("professionnel");
        }
      }
      // Retro-compat : ancienne reponse IA avec un seul champ "client".
      if (donnees.client && !donnees.clientNom && !donnees.clientPrenom && !donnees.clientRaisonSociale) {
        setClientNom(donnees.client);
      }

      const lignesRecues = Array.isArray(donnees.lignes) && donnees.lignes.length > 0 ? donnees.lignes : [{}];
      const nouvellesLignes = lignesRecues.map((l: any) => ({
        description: l.description || data.texte,
        prestation: l.prestation || "",
        quantite: String(l.quantite || 1),
        unite: l.unite || "forfait",
        prixUnitaire: l.prixUnitaire ? (Math.round(enNombre(l.prixUnitaire) * 100) / 100).toString() : "",
        prixPropose: Boolean(l.prixPropose),
        prixManquant: !l.prixUnitaire,
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
        setVueResume(true);
      }

      // Facture dictee : date de prestation = aujourd'hui par defaut
      // (modifiable dans « Modifier les détails »), comme a la conversion
      // devis -> facture.
      if (typeDocument === "facture") {
        const d = new Date();
        const jj = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        setDatePrestation((ancien) => ancien || `${d.getFullYear()}-${mm}-${jj}`);
        setDateAffichage((ancien) => ancien || `${jj}/${mm}/${d.getFullYear()}`);
      }

      const auMoinsUnPrixPropose = lignesRecues.some((l: any) => l.prixPropose);
      const nomDocument = typeDocument === "facture" ? "Facture" : "Devis";
      setMessage(
        (auMoinsUnPrixPropose
          ? `${nomDocument} rempli automatiquement. Certains prix sont repris de ton carnet de tarifs, vérifie avant d'envoyer.`
          : `${nomDocument} rempli automatiquement, vérifie avant d'envoyer.`) +
          (clientConnu ? " Client déjà connu : ses coordonnées ont été reprises." : "")
      );
      setEtape("form");
    };

    recorder.start();
    debutEnregistrementRef.current = Date.now();
    setMicPreparation(false);
    setEnregistrement(true);
  }

  function arreterMicro() {
    mediaRecorderRef.current?.stop();
    setEnregistrement(false);
  }

  async function previsualiser() {
    if (proposerProfil("apercu")) return;
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
          clientNom: nomClientAffiche,
          clientTelephone: clientTelephone.trim() || null,
          clientSiren: sirenClient,
          clientType,
          adressePrestation: adressePrestation.trim() || null,
          debutPrestation: debutPrestation.trim() || null,
          dureePrestation: dureePrestation.trim() || null,
          clientAdresse,
          datePrestation: datePrestation || null,
          modePaiement,
          lignes: lignes.map((l) => ({
            description: l.description,
            quantite: enNombre(l.quantite),
            unite: l.unite,
            prixUnitaire: enNombre(l.prixUnitaire),
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

    if (existant?.fixe) {
      // Tarif saisi a la main dans « Mes tarifs » : son prix ne bouge pas.
      await supabase
        .from("prix_appris")
        .update({ nombre_utilisations: existant.nombre_utilisations + 1, updated_at: new Date().toISOString() })
        .eq("id", existant.id);
    } else if (existant) {
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

  // Cree le document en base (numero + lignes). Renvoie son id, ou null en
  // cas d erreur (message deja affiche).
  async function enregistrer(): Promise<string | null> {
    const estFacture = typeDocument === "facture";
    if (sirenSaisi === "invalide") {
      setMessage("Le SIREN du client doit contenir 9 chiffres (ou le SIRET, 14 chiffres).");
      return null;
    }
    setMessage("Enregistrement...");
    setLienSignature("");

    const { data: numero, error: erreurNumero } = await supabase.rpc(
      estFacture ? "numero_facture_suivant" : "numero_devis_suivant",
      { p_artisan_id: artisanId }
    );

    if (erreurNumero) {
      setMessage("Erreur de numérotation : " + erreurNumero.message);
      return null;
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
      : {
          numero_devis: numero,
          statut: "brouillon",
          debut_prestation: debutPrestation.trim() || null,
          duree_prestation: dureePrestation.trim() || null,
        };

    const { data: devis, error: erreurDevis } = await supabase
      .from("devis")
      .insert({
        artisan_id: artisanId,
        client_nom: nomClientAffiche,
        client_email: clientEmail.trim(),
        client_telephone: clientTelephone.trim() || null,
        ...(sirenClient ? { client_siren: sirenClient } : {}),
        client_adresse: clientAdresse,
        client_type: clientType,
        adresse_prestation: adressePrestation.trim() || null,
        total,
        ...infosDocument,
      })
      .select()
      .single();

    if (erreurDevis) {
      setMessage("Erreur : " + erreurDevis.message);
      return null;
    }

    const { error: erreurLignes } = await supabase.from("lignes_devis").insert(
      lignes.map((l, index) => ({
        devis_id: devis.id,
        ordre: index,
        description: l.description,
        quantite: enNombre(l.quantite),
        unite: l.unite,
        prix_unitaire: enNombre(l.prixUnitaire),
        total_ligne: (enNombre(l.quantite) || 0) * (enNombre(l.prixUnitaire) || 0),
      }))
    );

    if (erreurLignes) {
      setMessage("Erreur : " + erreurLignes.message);
      return null;
    }

    for (const l of lignes) {
      await apprendrePrix(l.prestation, l.unite, enNombre(l.prixUnitaire));
    }

    setDevisId(devis.id);
    setDevisEnregistre(true);
    return devis.id as string;
  }

  // « Enregistrer sans envoyer » : range le document dans Mes devis / Mes
  // factures, a envoyer plus tard.
  async function enregistrerSansEnvoyer() {
    if (envoiEnCours) return;
    setEnvoiEnCours(true);
    const id = await enregistrer();
    setEnvoiEnCours(false);
    if (!id) return;
    setMessage(
      typeDocument === "facture"
        ? "Facture enregistrée dans Mes factures. Tu pourras l'envoyer plus tard."
        : "Devis enregistré dans Mes devis. Tu pourras l'envoyer plus tard."
    );
  }

  // Bouton principal : enregistre (si ce n est pas deja fait) puis envoie,
  // en un seul appui.
  async function envoyerDirect() {
    if (envoiEnCours) return;
    const email = clientEmail.trim();
    if (!email || !email.includes("@")) {
      setMessage("Ajoute l'email du client pour lui envoyer. Sinon, utilise « Enregistrer sans envoyer ».");
      return;
    }
    if (!clientAdresse.trim()) {
      setMessage("Ajoute l'adresse du client : elle est obligatoire sur le document.");
      document.getElementById(vueResume ? "resume-adresse" : "client-adresse")?.focus();
      return;
    }
    if (proposerProfil("envoi")) return;
    setEnvoiEnCours(true);
    const dejaEnregistre = devisEnregistre;
    const id = dejaEnregistre ? devisId : await enregistrer();
    if (id) await envoyerAuClient(id, dejaEnregistre);
    setEnvoiEnCours(false);
  }

  // Met la base a jour avec le formulaire (client + lignes) pour un document
  // deja enregistre. Refuse si le devis a ete signe entre-temps.
  async function synchroniser(id: string): Promise<boolean> {
    const estFacture = typeDocument === "facture";
    if (!estFacture) {
      const { data: actuel } = await supabase.from("devis").select("statut").eq("id", id).maybeSingle();
      if (actuel?.statut === "signe") {
        setMessage("Ce devis vient d'être signé par ton client : il ne peut plus être modifié.");
        return false;
      }
    }
    const { error: erreurDevis } = await supabase
      .from("devis")
      .update({
        client_nom: nomClientAffiche,
        client_email: clientEmail.trim(),
        client_telephone: clientTelephone.trim() || null,
        ...(sirenClient ? { client_siren: sirenClient } : {}),
        client_adresse: clientAdresse,
        client_type: clientType,
        adresse_prestation: adressePrestation.trim() || null,
        total,
        ...(estFacture
          ? { date_prestation: datePrestation || null, moyen_paiement: modePaiement }
          : { debut_prestation: debutPrestation.trim() || null, duree_prestation: dureePrestation.trim() || null }),
      })
      .eq("id", id);
    if (erreurDevis) {
      setMessage("Erreur : " + erreurDevis.message);
      return false;
    }
    await supabase.from("lignes_devis").delete().eq("devis_id", id);
    const { error: erreurLignes } = await supabase.from("lignes_devis").insert(
      lignes.map((l, index) => ({
        devis_id: id,
        ordre: index,
        description: l.description,
        quantite: enNombre(l.quantite),
        unite: l.unite,
        prix_unitaire: enNombre(l.prixUnitaire),
        total_ligne: (enNombre(l.quantite) || 0) * (enNombre(l.prixUnitaire) || 0),
      }))
    );
    if (erreurLignes) {
      setMessage("Erreur : " + erreurLignes.message);
      return false;
    }
    return true;
  }

  // Lien « Enregistrer les modifications » (document deja enregistre).
  async function enregistrerModifications() {
    if (envoiEnCours) return;
    setEnvoiEnCours(true);
    setMessage("Enregistrement...");
    const ok = await synchroniser(devisId);
    setEnvoiEnCours(false);
    if (ok) {
      setMessage(
        typeDocument === "facture"
          ? "Modifications enregistrées dans Mes factures."
          : modification?.statut === "envoye"
            ? "Modifications enregistrées. Pense à renvoyer le devis à ton client."
            : "Modifications enregistrées dans Mes devis."
      );
    }
  }

  async function envoyerAuClient(id: string, dejaEnregistre: boolean) {
    const estFacture = typeDocument === "facture";
    setMessage(estFacture ? "Envoi de la facture en cours..." : "Envoi de l'email en cours...");

    // Une facture reutilise directement la route qui sert deja a (re)envoyer
    // une facture transformee depuis un devis (app/api/facture/[id]) : elle
    // relit tout depuis la ligne "devis"/"lignes_devis" en base plutot que
    // depuis la requete -- contrairement a /api/envoyer (devis) qui recoit
    // les infos client et les lignes directement dans son corps. On
    // resynchronise donc d'abord la base avec l'etat courant du formulaire,
    // pour qu'une modification faite juste avant l'envoi (ex: email corrige)
    // soit bien prise en compte. On le fait aussi pour un devis : un devis
    // « enregistre sans envoyer » puis modifie doit etre a jour dans Mes devis.
    if (estFacture || dejaEnregistre) {
      if (!(await synchroniser(id))) return;
    }

    const res = estFacture
      ? await fetch(`/api/facture/${id}`, {
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
            clientNom: nomClientAffiche,
            clientTelephone: clientTelephone.trim() || null,
            clientSiren: sirenClient,
            clientType,
            adressePrestation: adressePrestation.trim() || null,
            debutPrestation: debutPrestation.trim() || null,
            dureePrestation: dureePrestation.trim() || null,
            clientAdresse,
            lignes: lignes.map((l) => ({
              description: l.description,
              quantite: enNombre(l.quantite),
              unite: l.unite,
              prixUnitaire: enNombre(l.prixUnitaire),
            })),
            prix: total,
            devisId: id,
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
        .eq("id", id);
    }

    // On reste sur le document envoye, avec une confirmation claire (plutot
    // que de revenir d'un coup sur le micro) ; « Nouveau devis » repart a zero.
    setLienSignature(`${window.location.origin}/signer/${id}`);
    setEnvoiConfirme({ email: clientEmail.trim(), nom: nomClientAffiche });
    setMessage("");
  }

  // « Modifier » depuis Mes devis : charge le devis dans le resume. Un devis
  // signe n'est pas modifiable (le client a signe cette version-la).
  useEffect(() => {
    if (!artisanId) return;
    const id = new URLSearchParams(window.location.search).get("modifier");
    if (!id) return;
    (async () => {
      const { data: d } = await supabase.from("devis").select("*").eq("id", id).maybeSingle();
      if (!d || d.est_facture || d.statut === "signe") {
        window.history.replaceState(null, "", "/");
        setMessage(
          d?.statut === "signe"
            ? "Ce devis est signé : il ne peut plus être modifié. Fais un nouveau devis si besoin."
            : "Devis introuvable."
        );
        return;
      }
      const { data: lignesBase } = await supabase
        .from("lignes_devis")
        .select("*")
        .eq("devis_id", id)
        .order("ordre", { ascending: true });
      const enTexte = (n: number | null) => (n === null || n === undefined ? "" : String(n).replace(".", ","));

      setTypeDocument("devis");
      // Un seul champ client_nom en base : nom de l'entreprise pour un client
      // pro (anciens documents sans type : pro si un SIREN est connu), sinon
      // on le remet tel quel dans « Nom du client ».
      const pro = d.client_type ? d.client_type === "professionnel" : Boolean(d.client_siren);
      setClientType(pro ? "professionnel" : "particulier");
      setClientPrenom("");
      setClientRaisonSociale(pro ? d.client_nom || "" : "");
      setClientNom(pro ? "" : d.client_nom || "");
      setClientEmail(d.client_email || "");
      setClientTelephone(d.client_telephone || "");
      setClientSiren(d.client_siren || "");
      setClientAdresse(d.client_adresse || "");
      setAdressePrestation(d.adresse_prestation || "");
      setAdressePrestationOuverte(Boolean(d.adresse_prestation));
      setDebutPrestation(d.debut_prestation || "");
      setDureePrestation(d.duree_prestation || "");
      setLignes(
        lignesBase && lignesBase.length > 0
          ? lignesBase.map((l: any) => ({
              description: l.description || "",
              prestation: "",
              quantite: enTexte(l.quantite) || "1",
              unite: l.unite || "forfait",
              prixUnitaire: enTexte(l.prix_unitaire),
              prixPropose: false,
            }))
          : [ligneVide()]
      );
      setDevisId(d.id);
      setDevisEnregistre(true);
      setModification({ numero: d.numero_devis ?? null, statut: d.statut });
      setEnvoiConfirme(null);
      setLienSignature("");
      setMessage("");
      setVueResume(true);
      setEtape("form");
    })();
  }, [artisanId]);

  // Remet la dictee a zero pour un nouveau document.
  function nouveauDocument() {
    setModification(null);
    if (window.location.search.includes("modifier=")) window.history.replaceState(null, "", "/");
    setEnvoiConfirme(null);
    setLienSignature("");
    setMessage("");
    setDevisId("");
    setClientPrenom("");
    setClientNom("");
    setClientRaisonSociale("");
    setClientEmail("");
    setClientTelephone("");
    setClientSiren("");
    setClientAdresse("");
    setClientType("particulier");
    setAdressePrestation("");
    setAdressePrestationOuverte(false);
    setCasesDemandees([]);
    setDebutPrestation("");
    setDureePrestation("");
    setDatePrestation("");
    setDateAffichage("");
    setModePaiement(MODES_PAIEMENT_FACTURE[1].valeur);
    setLignes([ligneVide()]);
    setDevisEnregistre(false);
    setVueResume(false);
    setLigneOuverte(null);
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
        <BanniereRodage />

        <div className="voice-screen">
          <div className="voice-top">
            <p className="voice-greeting">
              <span className="voice-greeting-hand">Bonjour</span>
              {nomSalutation ? ` ${nomSalutation}` : ""} !
            </p>
            {toggleTypeDocument}
          </div>

          <div className="voice-middle">
            <div className="mic-wrap mic-wrap--hero">
              <span className="mic-label">
                {micPreparation
                  ? "Prépare-toi…"
                  : enregistrement
                  ? "Je t'écoute, appuie pour arrêter"
                  : typeDocument === "facture"
                    ? "Appuie et dicte ta facture"
                    : "Appuie et dicte ton devis"}
              </span>

              <button
                className={`mic-button mic-button--hero${enregistrement ? " recording" : micPreparation ? " preparation" : ""}`}
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

            {message ? (
              <p className="message">{message}</p>
            ) : (
              !enregistrement && !micPreparation && (
                <div className="dictee-guide">
                  <div className="dictee-guide-bulles">
                    <span>👤 Pour qui</span>
                    <span>🔧 Quoi</span>
                    <span>💶 Combien</span>
                  </div>
                  <p className="dictee-guide-exemple">
                    « Pour Madame Martin, 12 rue des Lilas à Lyon : peinture du salon, 25 m² à 30 euros. »
                  </p>
                </div>
              )
            )}
          </div>

          <button
            className="voice-skip"
            onClick={() => {
              setVueResume(false);
              setEtape("form");
            }}
          >
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
      <Topbar forcerRetour onRetour={() => (envoiConfirme ? nouveauDocument() : setEtape("voice"))} />

      <h1 className="page-title">
        {modification
          ? `Modifier le devis${modification.numero ? ` n°${modification.numero}` : ""}`
          : typeDocument === "facture"
            ? "Nouvelle facture"
            : "Nouveau devis"}
      </h1>

      {!devisEnregistre && toggleTypeDocument}

      <div className="form-mic">
        <div className={`form-mic-onde form-mic-onde--gauche${enregistrement ? " active" : ""}`} aria-hidden="true">
          {ONDES_MINI.map((amp, i) => (
            <span key={i} style={{ "--amp": amp, animationDelay: `${i * 0.12}s` } as CSSProperties} />
          ))}
        </div>

        <button
          type="button"
          className={`form-mic-btn${enregistrement ? " recording" : micPreparation ? " preparation" : ""}`}
          onClick={enregistrement ? arreterMicro : demarrerMicro}
          aria-label={enregistrement ? "Arrêter la dictée" : "Compléter en dictant"}
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
        {micPreparation ? "Prépare-toi…" : enregistrement ? "Je t'écoute, appuie pour arrêter" : "Compléter en dictant"}
      </p>

      {vueResume ? (
        <div className="form-bloc">
          <div className="form-carte resume-carte">
            <div className="type-toggle" role="tablist" aria-label="Type de client" style={{ marginBottom: 12 }}>
              <button
                type="button"
                role="tab"
                aria-selected={!estPro}
                className={!estPro ? "actif" : ""}
                onClick={() => setClientType("particulier")}
              >
                Particulier
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={estPro}
                className={estPro ? "actif" : ""}
                onClick={() => setClientType("professionnel")}
              >
                Professionnel
              </button>
            </div>
            {/* Nom seul (ex : « Monsieur Martin ») ou rien dicte : il s'affiche
                dans la case « Nom du client » ci-dessous, pas en double ici. */}
            {clientPrenom.trim() || (estPro && clientRaisonSociale.trim()) ? (
              <p className="resume-client-nom">{nomClientAffiche}</p>
            ) : (
              <div className="champ">
                <label className="champ-label" htmlFor="resume-nom">Nom du client</label>
                <input
                  id="resume-nom"
                  className="field"
                  placeholder="Ex : Mme Martin"
                  value={clientNom}
                  onChange={(e) => setClientNom(e.target.value)}
                />
              </div>
            )}
            {((clientAdresse.trim() && !caseDemandee("adresse")) || clientTelephone.trim()) && (
              <p className="resume-client-info">
                {[caseDemandee("adresse") ? "" : clientAdresse.trim(), clientTelephone.trim()].filter(Boolean).join(" · ")}
              </p>
            )}
            {adressePrestation.trim() && (
              <p className="resume-client-info">Lieu de la prestation : {adressePrestation.trim()}</p>
            )}
            {typeDocument === "devis" && (debutPrestation.trim() || dureePrestation.trim()) && (
              <p className="resume-client-info">
                {[
                  debutPrestation.trim() && `Début : ${debutPrestation.trim()}`,
                  dureePrestation.trim() && `Durée : ${dureePrestation.trim()}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {typeDocument === "facture" && (
              <p className="resume-client-info">
                Prestation réalisée le {dateAffichage || "—"} ·{" "}
                {MODES_PAIEMENT_FACTURE.find((m) => m.valeur === modePaiement)?.libelle}
              </p>
            )}

            <div className="resume-cases">
              <div className="champ">
                <label className="champ-label" htmlFor="resume-email">
                  Email du client <span style={{ fontWeight: 400 }}>— pour lui envoyer</span>
                </label>
                <input
                  id="resume-email"
                  className="field"
                  type="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="marie.dupont@email.fr"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value.toLowerCase())}
                />
              </div>
              {caseDemandee("adresse") && (
                <div className="champ">
                  <label className="champ-label" htmlFor="resume-adresse">
                    Adresse du client <span style={{ fontWeight: 400 }}>— obligatoire</span>
                  </label>
                  <input
                    id="resume-adresse"
                    className="field"
                    placeholder="12 rue des Lilas, 75011 Paris"
                    value={clientAdresse}
                    onChange={(e) => setClientAdresse(e.target.value)}
                  />
                </div>
              )}
              {caseDemandee("entreprise") && (
                <div className="champ">
                  <label className="champ-label" htmlFor="resume-entreprise">Nom de l'entreprise</label>
                  <input
                    id="resume-entreprise"
                    className="field"
                    placeholder="Ex : Dupont & Fils SARL"
                    value={clientRaisonSociale}
                    onChange={(e) => setClientRaisonSociale(e.target.value)}
                  />
                </div>
              )}
              {caseDemandee("siren") && (
                <div className="champ">
                  <label className="champ-label" htmlFor="resume-siren">
                    SIREN de l'entreprise <span style={{ fontWeight: 400 }}>— obligatoire sur la facture</span>
                  </label>
                  <input
                    id="resume-siren"
                    className="field"
                    inputMode="numeric"
                    autoCorrect="off"
                    placeholder="123 456 789"
                    value={clientSiren}
                    onChange={(e) => setClientSiren(e.target.value)}
                  />
                  {sirenSaisi === "invalide" ? (
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#c0392b" }}>
                      9 chiffres attendus (ou le SIRET, 14 chiffres).
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="resume-lignes">
              {lignes.map((ligne, index) => {
                const qte = enNombre(ligne.quantite) || 0;
                const prix = enNombre(ligne.prixUnitaire) || 0;
                const auForfait = ligne.unite === "forfait" && (qte || 1) === 1;

                if (index === ligneOuverte) {
                  return (
                    <div key={index} className="resume-edition">
                      <div className="champ">
                        <label className="champ-label">Désignation</label>
                        <textarea
                          className="field"
                          rows={2}
                          placeholder="Ex : Peinture du salon"
                          value={ligne.description}
                          onChange={(e) => majLigne(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="champ champ-duo">
                        {!auForfait && (
                          <div>
                            <label className="champ-label">Quantité</label>
                            <input
                              className="field"
                              inputMode="decimal"
                              value={ligne.quantite}
                              onChange={(e) => majLigne(index, "quantite", e.target.value)}
                            />
                          </div>
                        )}
                        <div>
                          <label className="champ-label">Unité</label>
                          <select className="field" value={ligne.unite} onChange={(e) => changerUnite(index, e.target.value)}>
                            {UNITES.map((u) => (
                              <option key={u.valeur} value={u.valeur}>
                                {u.libelle}
                              </option>
                            ))}
                            {!UNITES.some((u) => u.valeur === ligne.unite) && (
                              <option value={ligne.unite}>{ligne.unite}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="champ-label">{auForfait ? "Prix (€)" : `€ / ${ligne.unite}`}</label>
                          <input
                            className="field"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={ligne.prixUnitaire}
                            onChange={(e) => {
                              majLigne(index, "prixUnitaire", e.target.value);
                              majLigne(index, "prixPropose", false);
                            }}
                          />
                        </div>
                      </div>
                      <div className="resume-edition-actions">
                        {lignes.length > 1 ? (
                          <button
                            type="button"
                            className="ligne-presta-suppr"
                            aria-label="Supprimer cette ligne"
                            onClick={() => {
                              supprimerLigne(index);
                              setLigneOuverte(null);
                            }}
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
                        ) : (
                          <span />
                        )}
                        <button type="button" className="btn btn-primary" onClick={() => fermerLigne(index)}>
                          OK
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className="resume-ligne resume-ligne--touchable"
                    role="button"
                    tabIndex={0}
                    onClick={() => ouvrirLigne(index)}
                    onKeyDown={(e) => e.key === "Enter" && ouvrirLigne(index)}
                  >
                    <div className="resume-ligne-texte">
                      <span>{ligne.description || "Prestation"}</span>
                      {!auForfait && prix > 0 && (
                        <span className="resume-ligne-detail">
                          {qte.toLocaleString("fr-FR")}{" "}
                          {qte > 1 && ["heure", "jour", "unité"].includes(ligne.unite) ? `${ligne.unite}s` : ligne.unite} ×{" "}
                          {euros(prix)}
                        </span>
                      )}
                      {ligne.prixPropose && <span className="resume-ligne-carnet">Prix de ton carnet</span>}
                    </div>
                    {ligne.prixManquant ? (
                      <input
                        className="field resume-ligne-prix"
                        inputMode="decimal"
                        placeholder={auForfait ? "Prix €" : `€ / ${ligne.unite}`}
                        aria-label="Prix"
                        value={ligne.prixUnitaire}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onChange={(e) => majLigne(index, "prixUnitaire", e.target.value)}
                      />
                    ) : (
                      <strong className="resume-ligne-montant">{euros(qte * prix)}</strong>
                    )}
                  </div>
                );
              })}
            </div>
            {ligneOuverte === null && (
              <div className="resume-pied">
                <span>Touche une ligne pour la modifier</span>
                <button
                  type="button"
                  className="resume-ajouter"
                  onClick={() => {
                    ajouterLigne();
                    setLigneOuverte(lignes.length);
                  }}
                >
                  + Ajouter une ligne
                </button>
              </div>
            )}
          </div>
          <button type="button" className="voice-skip resume-modifier" onClick={() => setVueResume(false)}>
            Modifier les détails
          </button>
        </div>
      ) : (
      <>
      <div className="form-bloc">
        <p className="form-bloc-titre">Client</p>
        <div className="form-carte">
          <div className="type-toggle" role="tablist" aria-label="Type de client">
            <button
              type="button"
              role="tab"
              aria-selected={!estPro}
              className={!estPro ? "actif" : ""}
              onClick={() => setClientType("particulier")}
            >
              Particulier
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={estPro}
              className={estPro ? "actif" : ""}
              onClick={() => setClientType("professionnel")}
            >
              Professionnel
            </button>
          </div>
          <div className="champ champ-duo">
            <div>
              <label className="champ-label" htmlFor="client-prenom">Prénom</label>
              <input
                id="client-prenom"
                className="field"
                placeholder="Marie"
                value={clientPrenom}
                onChange={(e) => setClientPrenom(e.target.value)}
              />
            </div>
            <div>
              <label className="champ-label" htmlFor="client-nom">Nom</label>
              <input
                id="client-nom"
                className="field"
                placeholder="Dupont"
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
              />
            </div>
          </div>
          {estPro ? (
            <div className="champ">
              <label className="champ-label" htmlFor="client-raison">Nom de l'entreprise</label>
              <input
                id="client-raison"
                className="field"
                placeholder="Ex : Dupont & Fils SARL"
                value={clientRaisonSociale}
                onChange={(e) => setClientRaisonSociale(e.target.value)}
              />
            </div>
          ) : null}
          {estPro ? (
            <div className="champ">
              <label className="champ-label" htmlFor="client-siren">
                SIREN de l'entreprise <span style={{ fontWeight: 400 }}>— obligatoire sur la facture</span>
              </label>
              <input
                id="client-siren"
                className="field"
                inputMode="numeric"
                autoCorrect="off"
                placeholder="123 456 789"
                value={clientSiren}
                onChange={(e) => setClientSiren(e.target.value)}
              />
              {sirenSaisi === "invalide" ? (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#c0392b" }}>
                  9 chiffres attendus (ou le SIRET, 14 chiffres).
                </p>
              ) : null}
            </div>
          ) : null}
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
            <label className="champ-label" htmlFor="client-tel">
              Téléphone du client <span style={{ fontWeight: 400 }}>— facultatif</span>
            </label>
            <input
              id="client-tel"
              className="field"
              type="tel"
              inputMode="tel"
              autoCorrect="off"
              placeholder="06 12 34 56 78"
              value={clientTelephone}
              onChange={(e) => setClientTelephone(e.target.value)}
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
          {adressePrestationOuverte ? (
            <div className="champ">
              <label className="champ-label" htmlFor="adresse-prestation">
                Adresse de la prestation <span style={{ fontWeight: 400 }}>— si différente</span>
              </label>
              <input
                id="adresse-prestation"
                className="field"
                placeholder="5 avenue des Pins, 13008 Marseille"
                value={adressePrestation}
                onChange={(e) => setAdressePrestation(e.target.value)}
              />
            </div>
          ) : (
            <button type="button" className="resume-ajouter" onClick={() => setAdressePrestationOuverte(true)}>
              + La prestation a lieu à une autre adresse
            </button>
          )}
        </div>
      </div>

      {typeDocument === "devis" && (
        <div className="form-bloc">
          <p className="form-bloc-titre">Délais (facultatif)</p>
          <div className="form-carte">
            <div className="champ champ-duo">
              <div>
                <label className="champ-label" htmlFor="debut-presta">Début prévu</label>
                <input
                  id="debut-presta"
                  className="field"
                  placeholder="Ex : lundi 6 octobre"
                  value={debutPrestation}
                  onChange={(e) => setDebutPrestation(e.target.value)}
                />
              </div>
              <div>
                <label className="champ-label" htmlFor="duree-presta">Durée estimée</label>
                <input
                  id="duree-presta"
                  className="field"
                  placeholder="Ex : 3 jours"
                  value={dureePrestation}
                  onChange={(e) => setDureePrestation(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
            const totalLigne = (enNombre(ligne.quantite) || 0) * (enNombre(ligne.prixUnitaire) || 0);
            // En forfait (quantite 1) : juste Description + Prix. La quantite
            // reste visible si une ancienne ligne a un forfait x plusieurs.
            const auForfait = ligne.unite === "forfait" && (enNombre(ligne.quantite) || 1) === 1;
            const uniteConnue = UNITES.some((u) => u.valeur === ligne.unite);
            const menuUnite = (
              <div>
                <label className="champ-label">Unité</label>
                <select className="field" value={ligne.unite} onChange={(e) => changerUnite(index, e.target.value)}>
                  {UNITES.map((u) => (
                    <option key={u.valeur} value={u.valeur}>
                      {u.libelle}
                    </option>
                  ))}
                  {!uniteConnue && <option value={ligne.unite}>{ligne.unite}</option>}
                </select>
              </div>
            );
            const champPrix = (
              <div>
                <label className="champ-label">
                  {auForfait ? "Prix (€)" : ligne.unite === "forfait" ? "Prix unitaire (€)" : `Prix par ${ligne.unite} (€)`}
                </label>
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
              </div>
            );
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

                {auForfait ? (
                  <div className="champ champ-duo">
                    {champPrix}
                    {menuUnite}
                  </div>
                ) : (
                  <>
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
                      {menuUnite}
                    </div>
                    <div className="champ">{champPrix}</div>
                  </>
                )}
                {ligne.prixPropose && (
                  <p className="hint-success" style={{ margin: "-4px 0 0" }}>
                    Prix repris de ton carnet de tarifs
                  </p>
                )}

                {!auForfait && (
                  <div className="ligne-presta-soustotal">
                    <span>Sous-total</span>
                    <strong>{totalLigne.toFixed(2)} €</strong>
                  </div>
                )}
              </div>
            );
          })}

          <button type="button" className="btn btn-outline btn-bloc" onClick={ajouterLigne}>
            + Ajouter une ligne
          </button>
        </div>
      </div>
      </>
      )}

      <div className="form-bloc">
        <div className="total-bloc">
          <span className="total-bloc-label">
            Total HT
            <br />
            <span style={{ fontSize: 11.5 }}>
              TVA ajoutée sur {typeDocument === "facture" ? "la facture" : "le devis"} final
            </span>
          </span>
          <span className="total-bloc-montant">{euros(total)}</span>
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

        {envoiConfirme ? (
          <div className="envoi-confirme">
            <ProposerApresEnvoi
              session={session}
              artisanId={artisanId}
              nomClient={envoiConfirme.nom}
              typeDocument={typeDocument}
            />
            <p className="envoi-confirme-titre">
              ✓ {typeDocument === "facture" ? "Facture envoyée" : "Devis envoyé"}
              {envoiConfirme.nom ? ` à ${envoiConfirme.nom}` : ""}
            </p>
            <p className="envoi-confirme-texte">
              {typeDocument === "facture"
                ? `Ton client l'a reçue par email${envoiConfirme.email ? ` (${envoiConfirme.email})` : ""}. S'il ne règle pas, il sera relancé automatiquement.`
                : `Ton client l'a reçu par email${envoiConfirme.email ? ` (${envoiConfirme.email})` : ""}, avec le lien pour signer. Tu seras prévenu dès qu'il signe.`}
            </p>
            {lienSignature && (
              <p className="envoi-confirme-lien">
                {typeDocument === "facture" ? "Lien de suivi" : "Lien de signature"} (déjà dans l'email) :{" "}
                <a href={lienSignature} target="_blank" rel="noreferrer">
                  {lienSignature}
                </a>
              </p>
            )}
            <div className="envoi-confirme-actions">
              <Link href={typeDocument === "facture" ? "/factures" : "/devis"} className="btn btn-outline">
                {typeDocument === "facture" ? "Mes factures" : "Mes devis"}
              </Link>
              <button type="button" className="btn btn-primary" onClick={nouveauDocument}>
                {typeDocument === "facture" ? "Nouvelle facture" : "Nouveau devis"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Pas en meme temps que la fenetre « Ton devis est presque pret » :
                tant qu'elle n'a pas ete vue, c'est elle qui en parle. */}
            {clientType === "particulier" &&
              mentionsManquantes.length > 0 &&
              !(typeDocument === "devis" && !popupProfilDejaVue && profilAManque) && (
              <div className="rappel-mentions">
                <span>
                  Client particulier : {mentionsManquantes.join(" et ")}{" "}
                  {mentionsManquantes.length > 1 ? "doivent" : "doit"} figurer sur le document.
                </span>
                <button type="button" onClick={() => setPopupMentions(true)}>
                  {mentionsManquantes.length > 1 ? "Les ajouter" : "L'ajouter"} →
                </button>
              </div>
            )}
            {popupProfil && (
              <PopupProfilIncomplet
                manqueAssurance={!mentionsProfil?.assurance.trim()}
                manqueMediateur={!mentionsProfil?.mediateur.trim()}
                manqueLogo={!profilArtisan?.logo_url}
                onCompleter={popupProfilCompleter}
                onPlusTard={popupProfilPlusTard}
                enCours={popupProfilEnCours}
              />
            )}
            {typeDocument === "facture" && <RappelIban profil={profilArtisan} artisanId={artisanId} />}
            {popupMentions && artisanId && mentionsProfil && (
              <PopupAssuranceMediateur
                artisanId={artisanId}
                assurance={mentionsProfil.assurance}
                mediateur={mentionsProfil.mediateur}
                onEnregistre={(valeurs) => {
                  setMentionsProfil(valeurs);
                  setPopupMentions(false);
                }}
                onFermer={() => setPopupMentions(false)}
              />
            )}
            <button className="btn btn-primary btn-bloc" onClick={envoyerDirect} disabled={envoiEnCours}>
              {envoiEnCours
                ? "Envoi en cours..."
                : modification?.statut === "envoye"
                  ? "✉ Renvoyer au client"
                  : "✉ Envoyer au client"}
            </button>
            {devisEnregistre ? (
              <button type="button" className="lien-sans-envoyer" onClick={enregistrerModifications} disabled={envoiEnCours}>
                Enregistrer les modifications
              </button>
            ) : (
              <button type="button" className="lien-sans-envoyer" onClick={enregistrerSansEnvoyer} disabled={envoiEnCours}>
                Enregistrer sans envoyer
              </button>
            )}
          </>
        )}

        {message && <p className="message">{message}</p>}
      </div>

      {lienSignature && !envoiConfirme && (
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
