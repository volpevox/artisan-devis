import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { MENTION_PENALITES_RETARD_DEFAUT } from "./mentionsDocuments";
import { formaterSiren } from "./siren";
import fs from "fs";
import path from "path";

// Memes polices que la webapp : Poppins (titres), Montserrat (texte),
// Roboto (gros chiffres). Fichiers stockes dans lib/polices (et embarques
// dans les fonctions Vercel via next.config.js) : avant, chaque demarrage a
// froid du serveur les retelechargeait depuis Google Fonts (~0,5 s de plus
// sur l ouverture d un PDF).
function police(nom: string) {
  return path.join(process.cwd(), "lib", "polices", `${nom}.ttf`);
}
Font.register({
  family: "Poppins",
  fonts: [
    { src: police("Poppins-600"), fontWeight: 600 },
    { src: police("Poppins-700"), fontWeight: 700 },
    { src: police("Poppins-800"), fontWeight: 800 },
  ],
});

Font.register({
  family: "Montserrat",
  fonts: [
    { src: police("Montserrat-400"), fontWeight: 400 },
    { src: police("Montserrat-500"), fontWeight: 500 },
    { src: police("Montserrat-600"), fontWeight: 600 },
    { src: police("Montserrat-700"), fontWeight: 700 },
  ],
});

Font.register({
  family: "Roboto",
  fonts: [
    { src: police("Roboto-500"), fontWeight: 500 },
    { src: police("Roboto-700"), fontWeight: 700 },
  ],
});

// Pas de cesure automatique au milieu des mots.
Font.registerHyphenationCallback((mot) => [mot]);

// Renard VolpeVox (filigrane + pied de page) lu sur le disque plutot que
// telecharge depuis le site a chaque PDF. Secours : l adresse du site.
function chargerLogoVolpeVox() {
  try {
    return { data: fs.readFileSync(path.join(process.cwd(), "public", "fox-icon.png")), format: "png" as const };
  } catch {
    return "https://app.volpevox.fr/fox-icon.png";
  }
}
const LOGO_VOLPEVOX = chargerLogoVolpeVox();

// Identite VolpeVox : bleu clair du renard (onde du logo) + or, sur fond
// blanc imprimable. Textes sombres pour rester lisibles a l'impression.
const BLEU = "#0b2a5b";
const OR = "#d4af37";
const OR_TEXTE = "#8f6508";
const CREME = "#fbf7ec";
const ENCRE = "#0f1a2b";
const TEXTE = "#111827";
const MUTED = "#374151";
const SUR_BLEU = "#dbe4f0";
const LIGNE = "#e8eaee";
const ZEBRE = "#f8f9fb";
const VERT = "#1f9d64";

const styles = StyleSheet.create({
  page: { fontFamily: "Montserrat", fontSize: 9.5, color: TEXTE, backgroundColor: "#ffffff", paddingBottom: 70 },

  // --- Bandeau d'en-tete bleu, bord bas droit souligne d'or ---
  bandeau: {
    backgroundColor: BLEU,
    height: 96,
    paddingHorizontal: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2.5,
    borderColor: OR,
  },
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
  logoInitiales: { fontFamily: "Poppins", fontWeight: 700, fontSize: 22, color: BLEU },
  marqueNom: { fontFamily: "Poppins", fontWeight: 700, fontSize: 14, color: "#ffffff" },
  marqueMeta: { fontSize: 8.5, fontWeight: 600, color: SUR_BLEU, marginTop: 4, lineHeight: 1.4 },

  titreBloc: { alignItems: "flex-end" },
  titre: { fontFamily: "Poppins", fontWeight: 800, fontSize: 30, color: OR, letterSpacing: 3, textTransform: "uppercase" },
  titreMeta: { fontSize: 8.5, fontWeight: 600, color: SUR_BLEU, marginTop: 2 },
  titreNumero: { fontFamily: "Roboto", fontWeight: 700, fontSize: 10, color: "#ffffff", marginTop: 4, lineHeight: 1.2 },

  contenu: { paddingHorizontal: 34, paddingTop: 22 },

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
    backgroundColor: BLEU,
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
  clientNom: { fontFamily: "Poppins", fontWeight: 700, fontSize: 13, color: ENCRE },
  clientInfo: { fontSize: 9, fontWeight: 500, color: MUTED, marginTop: 3 },
  clientPrestation: { fontSize: 9, color: TEXTE, marginTop: 8, fontWeight: 700 },
  montantValeur: { fontFamily: "Roboto", fontWeight: 700, fontSize: 21, color: "#ffffff", lineHeight: 1.1 },
  montantNote: { fontSize: 8, fontWeight: 600, color: SUR_BLEU, marginTop: 4 },

  // --- Tableau des lignes ---
  tableau: { marginTop: 16 },
  tableEntete: {
    flexDirection: "row",
    backgroundColor: BLEU,
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
  description: { fontSize: 9.5, fontWeight: 500, color: TEXTE, lineHeight: 1.35 },
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
  chiffreFort: { fontFamily: "Roboto", fontWeight: 700, fontSize: 9.5, color: ENCRE, lineHeight: 1.2 },

  // --- Totaux ---
  totaux: { alignSelf: "flex-end", width: 240, marginTop: 10 },
  ligneTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 12,
    color: MUTED,
  },
  libelleTotal: { fontSize: 9.5, fontWeight: 600, color: MUTED, lineHeight: 1.3 },
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
    backgroundColor: BLEU,
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
  totalTTCLabel: { fontFamily: "Poppins", fontWeight: 700, fontSize: 8.5, color: OR, letterSpacing: 1.4 },
  totalTTCValeur: { fontFamily: "Roboto", fontWeight: 700, fontSize: 17, color: "#ffffff", lineHeight: 1.1 },

  bandeauInfo: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: CREME,
    fontSize: 9,
    fontWeight: 700,
    color: ENCRE,
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
  mentionTexte: { fontSize: 8.5, fontWeight: 500, color: MUTED, lineHeight: 1.45 },
  mentionLegale: {
    marginTop: 14,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: LIGNE,
  },
  merci: { marginTop: 14, fontFamily: "Poppins", fontWeight: 600, fontSize: 10, color: ENCRE },

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
  piedLegal: { fontSize: 7.5, fontWeight: 500, color: MUTED, textAlign: "center", lineHeight: 1.4 },
  piedMarque: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  piedLogo: { width: 11, height: 11 },
  piedTexte: { fontSize: 7, color: MUTED },
  piedTexteMarque: { fontFamily: "Poppins", fontWeight: 600, color: ENCRE },
  filigrane: { position: "absolute", right: -40, bottom: 40, width: 230, height: 230, opacity: 0.045 },
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
    // Societe : "SARL au capital de 5 000 € · RCS Lyon" (lib/nomAffichage.ts).
    mentionSociete?: string | null;
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
  clientSiren?: string | null;
  lignes: LigneDevisPdf[];
  tauxTva: number;
  date: Date;
  signatureUrl?: string | null;
  signeLe?: Date | null;
  lieuSignature?: string | null;
  type?: "devis" | "facture" | "avoir";
  // Avoir : la facture qu'il annule (numero + date).
  avoirDe?: { numero: number | null; date: Date } | null;
  numero?: number | null;
  paiement?: { payeeLe: Date | null; moyenPaiement: string | null } | null;
  datePrestation?: Date | null;
}

export function DevisPDF({
  entreprise,
  clientNom,
  clientAdresse,
  clientTelephone,
  clientSiren,
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
  avoirDe,
}: DevisPdfProps) {
  const totalHT = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;
  // Un avoir suit la mise en page d'une facture (montants en negatif, passes
  // tels quels dans les lignes), sans paiement ni penalites.
  const estAvoir = type === "avoir";
  const estFacture = type === "facture" || estAvoir;
  const motDocument = estAvoir ? "Avoir" : estFacture ? "Facture" : "Devis";

  // Facture : "Fait a" (ville de l'artisan) en haut. Devis : le lieu de
  // signature du client est indique dans le cadre de signature.
  const lieuFaitA = estFacture ? entreprise.ville : null;

  // Devis : date limite de validite = date d'emission + N jours (reglage
  // "duree_validite_devis" du profil). N a 0 ou absent = pas de mention.
  const validiteJours = !estFacture ? Number(entreprise.validiteJours) || 0 : 0;
  const dateValidite = validiteJours > 0 ? new Date(date.getTime() + validiteJours * 86400000) : null;

  const infosPied = [
    entreprise.nom,
    entreprise.mentionSociete,
    entreprise.siret ? `SIRET ${entreprise.siret}` : null,
    entreprise.numeroTva ? `TVA intracom. ${entreprise.numeroTva}` : null,
    entreprise.iban ? `IBAN ${entreprise.iban.replace(/ /g, " ")}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const mentions = [
    entreprise.conditionsPaiement && !estAvoir
      ? { titre: "Conditions de paiement", texte: entreprise.conditionsPaiement }
      : null,
    entreprise.assurancePro ? { titre: "Assurance professionnelle", texte: entreprise.assurancePro } : null,
    entreprise.mediateurConso ? { titre: "Médiation de la consommation", texte: entreprise.mediateurConso } : null,
  ].filter((m): m is { titre: string; texte: string } => m !== null);

  const noteMontant = estAvoir
    ? "Montant remboursé ou déduit"
    : estFacture
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

        <View style={styles.bandeau}>
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
            <Text style={styles.titreNumero}>
              N° {estAvoir ? `AV-${numero}` : numero ?? numeroDocument(date, estFacture ? "FAC" : "DEV")}
            </Text>
            <Text style={styles.titreMeta}>
              {lieuFaitA ? `Fait à ${lieuFaitA}, le ` : ""}
              {formaterDate(date)}
            </Text>
          </View>
        </View>

        <View style={styles.contenu}>
          <View style={styles.cartes}>
            <View style={styles.carteClient}>
              <Text style={styles.etiquette}>
                {motDocument} adressé{estFacture && !estAvoir ? "e" : ""} à
              </Text>
              <Text style={styles.clientNom}>{clientNom}</Text>
              {clientAdresse ? <Text style={styles.clientInfo}>{clientAdresse}</Text> : null}
              {clientTelephone ? <Text style={styles.clientInfo}>Tél. {clientTelephone}</Text> : null}
              {clientSiren ? <Text style={styles.clientInfo}>SIREN {formaterSiren(clientSiren)}</Text> : null}
              {/* Categorie de l'operation, mention obligatoire de la reforme
                  de la facturation electronique. Un artisan facture une
                  prestation (main d'oeuvre, fournitures comprises). */}
              {estFacture ? <Text style={styles.clientInfo}>Opération : prestation de services</Text> : null}
              {estAvoir && avoirDe ? (
                <Text style={styles.clientPrestation}>
                  Annule la facture n° {avoirDe.numero ?? "—"} du {formaterDate(avoirDe.date)}
                </Text>
              ) : null}
              {estFacture && datePrestation ? (
                <Text style={styles.clientPrestation}>Prestation réalisée le {formaterDate(datePrestation)}</Text>
              ) : null}
            </View>
            <View style={styles.carteMontant}>
              <Text style={[styles.etiquette, styles.etiquetteClaire]}>
                {estAvoir ? "Montant de l'avoir" : estFacture ? "Total de la facture" : "Montant du devis"}
              </Text>
              <View>
                <Text style={styles.montantValeur}>{euros(totalTTC)}</Text>
                <Text style={styles.montantNote}>{noteMontant}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tableau}>
            <View style={styles.tableEntete}>
              <Text style={[styles.tableEnteteTexte, styles.colNum, { color: "#ffffff" }]}>#</Text>
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

          {estAvoir ? (
            <Text style={styles.bandeauInfo}>
              Cet avoir annule intégralement la facture n° {avoirDe?.numero ?? "—"}.
            </Text>
          ) : estFacture && paiement?.payeeLe ? (
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

          {estAvoir ? null : estFacture ? (
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
