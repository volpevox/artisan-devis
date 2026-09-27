import { Document, Page, Text, View, Image, StyleSheet, Font, Svg, Rect, Polygon, Line } from "@react-pdf/renderer";
import { MENTION_PENALITES_RETARD_DEFAUT } from "./mentionsDocuments";

// Memes polices que la webapp : Poppins (titres), Montserrat (texte),
// Roboto (gros chiffres).
Font.register({
  family: "Poppins",
  fonts: [
    { src: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6V1s.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7V1s.ttf", fontWeight: 700 },
    { src: "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLDD4V1s.ttf", fontWeight: 800 },
  ],
});

Font.register({
  family: "Montserrat",
  fonts: [
    { src: "https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtZ6Ew-.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCu170w-.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWub2bWmT.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjammT.ttf", fontWeight: 700 },
  ],
});

// Pas de cesure automatique au milieu des mots.
Font.registerHyphenationCallback((mot) => [mot]);

const LOGO_VOLPEVOX = "https://app.volpevox.fr/fox-icon.png";

// Identite VolpeVox : bleu nuit + or, sur fond blanc imprimable.
const NUIT = "#152238";
const NUIT_DOUX = "#24344f";
const OR = "#d4af37";
const OR_TEXTE = "#a9790f";
const CREME = "#fbf7ec";
const TEXTE = "#1f2a3b";
const MUTED = "#6b7280";
const MUTED_CLAIR = "#aab4c3";
const LIGNE = "#e8eaee";
const ZEBRE = "#f8f9fb";
const VERT = "#1f9d64";

const styles = StyleSheet.create({
  page: { fontFamily: "Montserrat", fontSize: 9.5, color: TEXTE, backgroundColor: "#ffffff", paddingBottom: 70 },

  // --- Bandeau d'en-tete bleu nuit ---
  bandeau: {
    backgroundColor: NUIT,
    paddingTop: 0,
    paddingBottom: 22,
    paddingHorizontal: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  onde: { position: "absolute", top: 0, left: 0 },

  // --- Parcours Devis -> Signe -> Facture -> Regle ---
  parcours: { flexDirection: "row", marginTop: 2, marginBottom: 16, position: "relative" },
  parcoursTrait: { position: "absolute", top: 5, left: "12.5%", right: "12.5%", height: 1.5, backgroundColor: LIGNE },
  parcoursTraitFait: { position: "absolute", top: 5, left: "12.5%", height: 1.5, backgroundColor: OR },
  etape: { flex: 1, alignItems: "center" },
  pastilleEtape: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: LIGNE, backgroundColor: "#ffffff" },
  pastilleFaite: { borderColor: NUIT, backgroundColor: NUIT },
  pastilleActive: { borderColor: OR, backgroundColor: OR },
  etapeTexte: {
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 6.8,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: MUTED_CLAIR,
    marginTop: 5,
  },
  etapeTexteFaite: { color: NUIT },
  etapeTexteActive: { color: OR_TEXTE },
  marque: { flexDirection: "row", alignItems: "center", gap: 14, maxWidth: "60%" },
  logoPuce: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: 56, height: 56, objectFit: "contain" },
  logoInitiales: { fontFamily: "Poppins", fontWeight: 700, fontSize: 22, color: NUIT },
  marqueNom: { fontFamily: "Poppins", fontWeight: 600, fontSize: 14, color: "#ffffff" },
  marqueMeta: { fontSize: 8.5, color: MUTED_CLAIR, marginTop: 4, lineHeight: 1.4 },

  titreBloc: { alignItems: "flex-end" },
  titre: { fontFamily: "Poppins", fontWeight: 800, fontSize: 30, color: OR, letterSpacing: 3, textTransform: "uppercase" },
  titreMeta: { fontSize: 8.5, color: MUTED_CLAIR, marginTop: 2 },
  titreNumero: { fontFamily: "Roboto", fontWeight: 500, fontSize: 10, color: "#ffffff", marginTop: 4, lineHeight: 1.2 },

  contenu: { paddingHorizontal: 34, paddingTop: 8 },

  // --- Cartes client / montant ---
  cartes: { flexDirection: "row", gap: 14 },
  carteClient: {
    flex: 1.5,
    backgroundColor: CREME,
    borderLeftWidth: 3,
    borderColor: OR,
    borderRadius: 6,
    padding: 11,
  },
  carteMontant: {
    flex: 1,
    backgroundColor: NUIT,
    borderRadius: 6,
    padding: 11,
    justifyContent: "space-between",
  },
  etiquette: {
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 7.5,
    letterSpacing: 1.6,
    color: OR_TEXTE,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  etiquetteClaire: { color: OR },
  clientNom: { fontFamily: "Poppins", fontWeight: 600, fontSize: 13, color: NUIT },
  clientInfo: { fontSize: 9, color: MUTED, marginTop: 3 },
  clientPrestation: { fontSize: 9, color: TEXTE, marginTop: 8, fontWeight: 600 },
  montantValeur: { fontFamily: "Roboto", fontWeight: 700, fontSize: 21, color: "#ffffff", lineHeight: 1.1 },
  montantNote: { fontSize: 8, color: MUTED_CLAIR, marginTop: 4 },

  // --- Tableau des lignes ---
  tableau: { marginTop: 16 },
  tableEntete: {
    flexDirection: "row",
    backgroundColor: NUIT,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableEnteteTexte: {
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 7.5,
    color: "#ffffff",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tableLigne: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: LIGNE,
    alignItems: "flex-start",
  },
  tableLigneZebre: { backgroundColor: ZEBRE },
  colNum: { width: "6%", fontFamily: "Roboto", fontWeight: 500, fontSize: 9.5, color: OR_TEXTE, lineHeight: 1.2 },
  colDescription: { width: "44%", paddingRight: 8 },
  colQuantite: { width: "15%", textAlign: "right" },
  colPrixUnitaire: { width: "17%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },
  description: { fontSize: 9.5, color: TEXTE, lineHeight: 1.35 },
  pastille: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "rgba(212,175,55,0.16)",
    fontSize: 7,
    fontWeight: 600,
    color: OR_TEXTE,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chiffre: { fontFamily: "Roboto", fontWeight: 500, fontSize: 9.5, color: TEXTE, lineHeight: 1.2 },
  chiffreFort: { fontFamily: "Roboto", fontWeight: 700, fontSize: 9.5, color: NUIT, lineHeight: 1.2 },

  // --- Totaux ---
  totaux: { alignSelf: "flex-end", width: 240, marginTop: 10 },
  ligneTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 12,
    color: MUTED,
  },
  libelleTotal: { fontSize: 9.5, lineHeight: 1.3 },
  noteTva: {
    fontSize: 8.5,
    color: TEXTE,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 3,
    backgroundColor: CREME,
    borderRadius: 4,
  },
  // Total facon « ticket » : encoches rondes + pointilles.
  totalTTC: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: NUIT,
    borderRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 6,
    position: "relative",
  },
  encoche: {
    position: "absolute",
    top: "50%",
    marginTop: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  ticketPointilles: {
    flexGrow: 1,
    marginHorizontal: 10,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(212,175,55,0.5)",
  },
  totalTTCLabel: { fontFamily: "Poppins", fontWeight: 600, fontSize: 8.5, color: OR, letterSpacing: 1.4 },
  totalTTCValeur: { fontFamily: "Roboto", fontWeight: 700, fontSize: 17, color: "#ffffff", lineHeight: 1.1 },

  bandeauInfo: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: CREME,
    fontSize: 9,
    fontWeight: 600,
    color: NUIT,
    textAlign: "center",
  },
  acquittee: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: "rgba(31,157,100,0.1)",
    borderWidth: 1,
    borderColor: VERT,
    fontSize: 9,
    fontWeight: 700,
    color: VERT,
    textAlign: "center",
  },

  // --- Mentions ---
  mentions: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 14 },
  mention: { width: "47%" },
  mentionTitre: {
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 7.5,
    letterSpacing: 1.4,
    color: OR_TEXTE,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  mentionTexte: { fontSize: 8.5, color: MUTED, lineHeight: 1.45 },
  mentionLegale: {
    marginTop: 14,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: LIGNE,
  },
  merci: { marginTop: 14, fontFamily: "Poppins", fontWeight: 600, fontSize: 10, color: NUIT },

  // --- Signature (devis) ---
  signature: { flexDirection: "row", gap: 18, marginTop: 18 },
  signatureCadre: {
    flex: 1,
    borderWidth: 1,
    borderColor: LIGNE,
    borderRadius: 6,
    padding: 10,
    minHeight: 86,
  },
  signatureCadreClient: { borderColor: OR, borderStyle: "dashed" },
  signatureTitre: {
    fontFamily: "Poppins",
    fontWeight: 600,
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: MUTED,
    textTransform: "uppercase",
  },
  signatureInfo: { fontSize: 9, color: TEXTE, marginTop: 8 },
  signeBadge: { fontSize: 9, fontWeight: 700, color: VERT, marginTop: 8 },
  // Fond blanc explicite : le PNG de signature a un arriere-plan transparent
  // que le moteur PDF peut rendre en noir sans ce fond force.
  signatureImageFond: { backgroundColor: "#ffffff", marginTop: 6, alignItems: "center" },
  signatureImage: { height: 52, objectFit: "contain" },

  // --- Pied de page ---
  pied: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 34,
    borderTopWidth: 1,
    borderColor: LIGNE,
    alignItems: "center",
  },
  piedLegal: { fontSize: 7.5, color: MUTED, textAlign: "center", lineHeight: 1.4 },
  piedMarque: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  piedLogo: { width: 11, height: 11 },
  piedTexte: { fontSize: 7, color: MUTED },
  piedTexteMarque: { fontFamily: "Poppins", fontWeight: 600, color: NUIT },
  filigrane: { position: "absolute", right: -40, bottom: 40, width: 230, height: 230, opacity: 0.045 },
});

// Onde sonore (rappel du logo VolpeVox) : barres dorees de hauteurs
// variees, toujours les memes d'un document a l'autre.
const LARGEUR_PAGE = 595.28;
const HAUTEUR_BANDEAU = 104;
const HAUTEUR_ONDE = 16;
const BARRES = Array.from({ length: 132 }, (_, i) => {
  const h = 2 + (HAUTEUR_ONDE - 2) * Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11 + 0.6));
  return { x: 34 + i * 4, h };
});

function formaterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

// Format francais : "3 432,00 €". Espace insecable classique (l'espace fine
// renvoyee par Intl n'existe pas dans toutes les polices).
function euros(montant: number) {
  const texte = montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${texte.replace(/[  ]/g, " ")} €`;
}

function nombre(valeur: number) {
  return valeur.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[  ]/g, " ");
}

const PLURIELS: Record<string, string> = { heure: "heures", jour: "jours", unité: "unités", forfait: "forfaits" };

function uniteAccordee(unite: string, quantite: number) {
  return quantite > 1 ? PLURIELS[unite] ?? unite : unite;
}

// "Agent de securite (majoration nuit +10 %)" -> description + pastille.
function separerMajoration(description: string) {
  const trouve = description.match(/^(.*?)\s*\((majoration [^()]*)\)\s*$/i);
  return trouve ? { texte: trouve[1], majoration: trouve[2] } : { texte: description, majoration: null };
}

function numeroDocument(date: Date, prefixe: string) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${prefixe}-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}`;
}

function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase())
    .join("");
}

interface LigneDevisPdf {
  description: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
}

interface DevisPdfProps {
  entreprise: {
    nom?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    codePostal?: string | null;
    ville?: string | null;
    logoUrl?: string | null;
    siret?: string | null;
    numeroTva?: string | null;
    iban?: string | null;
    conditionsPaiement?: string | null;
    assurancePro?: string | null;
    mediateurConso?: string | null;
    validiteJours?: number | null;
    penalitesRetard?: string | null;
  };
  clientNom: string;
  clientAdresse?: string | null;
  clientTelephone?: string | null;
  lignes: LigneDevisPdf[];
  tauxTva: number;
  date: Date;
  signatureUrl?: string | null;
  signeLe?: Date | null;
  lieuSignature?: string | null;
  type?: "devis" | "facture";
  numero?: number | null;
  paiement?: { payeeLe: Date | null; moyenPaiement: string | null } | null;
  datePrestation?: Date | null;
}

export function DevisPDF({
  entreprise,
  clientNom,
  clientAdresse,
  clientTelephone,
  lignes,
  tauxTva,
  date,
  signatureUrl,
  signeLe,
  lieuSignature,
  type = "devis",
  numero,
  paiement,
  datePrestation,
}: DevisPdfProps) {
  const totalHT = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;
  const estFacture = type === "facture";
  const motDocument = estFacture ? "Facture" : "Devis";

  // Facture : "Fait a" (ville de l'artisan) en haut. Devis : le lieu de
  // signature du client est indique dans le cadre de signature.
  const lieuFaitA = estFacture ? entreprise.ville : null;

  // Devis : date limite de validite = date d'emission + N jours (reglage
  // "duree_validite_devis" du profil). N a 0 ou absent = pas de mention.
  const validiteJours = !estFacture ? Number(entreprise.validiteJours) || 0 : 0;
  const dateValidite = validiteJours > 0 ? new Date(date.getTime() + validiteJours * 86400000) : null;

  const infosPied = [
    entreprise.nom,
    entreprise.siret ? `SIRET ${entreprise.siret}` : null,
    entreprise.numeroTva ? `TVA intracom. ${entreprise.numeroTva}` : null,
    entreprise.iban ? `IBAN ${entreprise.iban.replace(/ /g, " ")}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  // Parcours : ou en est ce document. Facture dictee directement (sans
  // devis signe) : le parcours commence a la prestation.
  const ETAPES = estFacture
    ? signeLe
      ? ["Devis", "Signé", "Facturé", "Réglé"]
      : ["Prestation", "Facturé", "Réglé"]
    : ["Devis", "Signé", "Facturé", "Réglé"];
  const etapeActive = estFacture
    ? ETAPES.indexOf(paiement?.payeeLe ? "Réglé" : "Facturé")
    : signeLe
    ? 1
    : 0;

  const mentions = [
    entreprise.conditionsPaiement ? { titre: "Conditions de paiement", texte: entreprise.conditionsPaiement } : null,
    entreprise.assurancePro ? { titre: "Assurance professionnelle", texte: entreprise.assurancePro } : null,
    entreprise.mediateurConso ? { titre: "Médiation de la consommation", texte: entreprise.mediateurConso } : null,
  ].filter((m): m is { titre: string; texte: string } => m !== null);

  const noteMontant = estFacture
    ? paiement?.payeeLe
      ? "Réglée — merci !"
      : tauxTva > 0
      ? "Montant à régler, TVA comprise"
      : "Montant à régler"
    : dateValidite
    ? `Valable jusqu'au ${formaterDate(dateValidite)}`
    : tauxTva > 0
    ? "TVA comprise"
    : "Montant total";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={LOGO_VOLPEVOX} style={styles.filigrane} fixed />

        <View style={[styles.bandeau, { height: HAUTEUR_BANDEAU }]}>
          <Svg style={styles.onde} width={LARGEUR_PAGE} height={HAUTEUR_BANDEAU}>
            {BARRES.map((b, i) => (
              <Rect
                key={i}
                x={b.x}
                y={HAUTEUR_BANDEAU - 6 - HAUTEUR_ONDE / 2 - b.h / 2}
                width={1.8}
                height={b.h}
                rx={0.9}
                fill={OR}
                opacity={0.4}
              />
            ))}
          </Svg>
          <View style={styles.marque}>
            <View style={styles.logoPuce}>
              {entreprise.logoUrl ? (
                <Image src={entreprise.logoUrl} style={styles.logoImage} />
              ) : (
                <Text style={styles.logoInitiales}>{initiales(entreprise.nom || "?")}</Text>
              )}
            </View>
            <View>
              {entreprise.nom ? <Text style={styles.marqueNom}>{entreprise.nom}</Text> : null}
              <Text style={styles.marqueMeta}>
                {[entreprise.adresse, [entreprise.codePostal, entreprise.ville].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              {entreprise.telephone ? <Text style={styles.marqueMeta}>{entreprise.telephone}</Text> : null}
            </View>
          </View>

          <View style={styles.titreBloc}>
            <Text style={styles.titre}>{motDocument}</Text>
            <Text style={styles.titreNumero}>N° {numero ?? numeroDocument(date, estFacture ? "FAC" : "DEV")}</Text>
            <Text style={styles.titreMeta}>
              {lieuFaitA ? `Fait à ${lieuFaitA}, le ` : ""}
              {formaterDate(date)}
            </Text>
          </View>
        </View>
        <Svg width={LARGEUR_PAGE} height={22} style={{ marginTop: -1 }}>
          <Polygon points={`0,0 ${LARGEUR_PAGE},0 ${LARGEUR_PAGE},5 0,21`} fill={NUIT} />
          <Line x1={0} y1={21.5} x2={LARGEUR_PAGE} y2={5.5} stroke={OR} strokeWidth={2.2} />
        </Svg>

        <View style={styles.contenu}>
          <View style={styles.parcours}>
            <View style={styles.parcoursTrait} />
            {etapeActive > 0 ? (
              <View style={[styles.parcoursTraitFait, { width: `${(etapeActive / (ETAPES.length - 1)) * 75}%` }]} />
            ) : null}
            {ETAPES.map((etape, i) => {
              const faite = i < etapeActive;
              const active = i === etapeActive;
              return (
                <View style={styles.etape} key={etape}>
                  <View
                    style={[
                      styles.pastilleEtape,
                      ...(faite ? [styles.pastilleFaite] : []),
                      ...(active ? [styles.pastilleActive] : []),
                    ]}
                  />
                  <Text
                    style={[
                      styles.etapeTexte,
                      ...(faite ? [styles.etapeTexteFaite] : []),
                      ...(active ? [styles.etapeTexteActive] : []),
                    ]}
                  >
                    {etape}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.cartes}>
            <View style={styles.carteClient}>
              <Text style={styles.etiquette}>
                {motDocument} adressé{estFacture ? "e" : ""} à
              </Text>
              <Text style={styles.clientNom}>{clientNom}</Text>
              {clientAdresse ? <Text style={styles.clientInfo}>{clientAdresse}</Text> : null}
              {clientTelephone ? <Text style={styles.clientInfo}>Tél. {clientTelephone}</Text> : null}
              {estFacture && datePrestation ? (
                <Text style={styles.clientPrestation}>Prestation réalisée le {formaterDate(datePrestation)}</Text>
              ) : null}
            </View>
            <View style={styles.carteMontant}>
              <Text style={[styles.etiquette, styles.etiquetteClaire]}>
                {estFacture ? "Total de la facture" : "Montant du devis"}
              </Text>
              <View>
                <Text style={styles.montantValeur}>{euros(totalTTC)}</Text>
                <Text style={styles.montantNote}>{noteMontant}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tableau}>
            <View style={styles.tableEntete}>
              <Text style={[styles.tableEnteteTexte, styles.colNum]}>#</Text>
              <Text style={[styles.tableEnteteTexte, styles.colDescription]}>Désignation</Text>
              <Text style={[styles.tableEnteteTexte, styles.colQuantite]}>Qté</Text>
              <Text style={[styles.tableEnteteTexte, styles.colPrixUnitaire]}>Prix unit. HT</Text>
              <Text style={[styles.tableEnteteTexte, styles.colTotal]}>Total HT</Text>
            </View>
            {lignes.map((ligne, index) => {
              const { texte, majoration } = separerMajoration(ligne.description);
              return (
                <View
                  style={index % 2 === 1 ? [styles.tableLigne, styles.tableLigneZebre] : styles.tableLigne}
                  key={index}
                  wrap={false}
                >
                  <Text style={styles.colNum}>{String(index + 1).padStart(2, "0")}</Text>
                  <View style={styles.colDescription}>
                    <Text style={styles.description}>{texte}</Text>
                    {majoration ? <Text style={styles.pastille}>{majoration}</Text> : null}
                  </View>
                  <Text style={[styles.chiffre, styles.colQuantite]}>
                    {nombre(ligne.quantite)} {uniteAccordee(ligne.unite, ligne.quantite)}
                  </Text>
                  <Text style={[styles.chiffre, styles.colPrixUnitaire]}>{euros(ligne.prixUnitaire)}</Text>
                  <Text style={[styles.chiffreFort, styles.colTotal]}>{euros(ligne.quantite * ligne.prixUnitaire)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.totaux} wrap={false}>
            <View style={styles.ligneTotal}>
              <Text style={styles.libelleTotal}>Total HT</Text>
              <Text style={styles.chiffre}>{euros(totalHT)}</Text>
            </View>
            {tauxTva > 0 ? (
              <View style={styles.ligneTotal}>
                <Text style={styles.libelleTotal}>TVA ({nombre(tauxTva)} %)</Text>
                <Text style={styles.chiffre}>{euros(montantTva)}</Text>
              </View>
            ) : (
              <Text style={styles.noteTva}>TVA non applicable, art. 293 B du CGI</Text>
            )}
            <View style={styles.totalTTC}>
              <View style={[styles.encoche, { left: -6 }]} />
              <View style={[styles.encoche, { right: -6 }]} />
              <Text style={styles.totalTTCLabel}>TOTAL TTC</Text>
              <View style={styles.ticketPointilles} />
              <Text style={styles.totalTTCValeur}>{euros(totalTTC)}</Text>
            </View>
          </View>

          {dateValidite ? (
            <Text style={styles.bandeauInfo}>
              Ce devis est valable jusqu'au {formaterDate(dateValidite)} ({validiteJours} jours).
            </Text>
          ) : null}

          {estFacture && paiement?.payeeLe ? (
            <Text style={styles.acquittee}>
              Facture acquittée le {formaterDate(paiement.payeeLe)}
              {paiement.moyenPaiement ? ` par ${paiement.moyenPaiement}` : ""}
            </Text>
          ) : estFacture && paiement?.moyenPaiement ? (
            <Text style={styles.bandeauInfo}>Mode de paiement : {paiement.moyenPaiement}</Text>
          ) : null}

          {mentions.length > 0 ? (
            <View style={styles.mentions} wrap={false}>
              {mentions.map((m) => (
                <View style={styles.mention} key={m.titre}>
                  <Text style={styles.mentionTitre}>{m.titre}</Text>
                  <Text style={styles.mentionTexte}>{m.texte}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {estFacture ? (
            <>
              <View style={styles.mentionLegale} wrap={false}>
                <Text style={styles.mentionTexte}>{entreprise.penalitesRetard || MENTION_PENALITES_RETARD_DEFAUT}</Text>
              </View>
              <Text style={styles.merci}>Merci pour votre confiance.</Text>
            </>
          ) : (
            <View style={styles.signature} wrap={false}>
              <View style={styles.signatureCadre}>
                <Text style={styles.signatureTitre}>Date</Text>
                {signeLe ? (
                  <Text style={styles.signeBadge}>
                    Signé le {formaterDate(signeLe)}
                    {lieuSignature ? ` à ${lieuSignature}` : ""}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.signatureCadre, styles.signatureCadreClient]}>
                <Text style={styles.signatureTitre}>Bon pour accord — signature du client</Text>
                {signatureUrl ? (
                  <View style={styles.signatureImageFond}>
                    <Image src={signatureUrl} style={styles.signatureImage} />
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </View>

        <View style={styles.pied} fixed>
          <Text style={styles.piedLegal}>{infosPied || " "}</Text>
          <View style={styles.piedMarque}>
            <Image src={LOGO_VOLPEVOX} style={styles.piedLogo} />
            <Text style={styles.piedTexte}>
              Propulsé par <Text style={styles.piedTexteMarque}>VolpeVox</Text>
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
