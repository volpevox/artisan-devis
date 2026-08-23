import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Fraunces",
  fonts: [
    { src: "https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIcaRyjDvTUhUo.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIcUByjDvTUhUo.ttf", fontWeight: 700 },
    { src: "https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIcHhyjDvTUhUo.ttf", fontWeight: 900 },
  ],
});

Font.register({
  family: "Archivo",
  fonts: [
    { src: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTNDNp8B1uJ0o.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTT6jRp8B1uJ0o.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTT0zRp8B1uJ0o.ttf", fontWeight: 700 },
  ],
});

Font.register({
  family: "JetBrains Mono",
  fonts: [
    { src: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmSsac.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8FqtjPVmSsac.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPVmSsac.ttf", fontWeight: 700 },
  ],
});

const NUIT = "#0d1b2a";
const OR = "#d4af37";
const ARDOISE = "#3a4a5e";
const TEXTE = "#eef1f6";
const MUTED = "#93a0b3";
const MUTED_DOUX = "#b7c0cc";
const LIGNE = "rgba(255,255,255,0.08)";
const LIGNE_OR = "rgba(212,175,55,0.4)";
const TOP_BORDER = "rgba(212,175,55,0.25)";

const styles = StyleSheet.create({
  page: { fontFamily: "Archivo", fontSize: 10, color: TEXTE, backgroundColor: NUIT },

  top: {
    padding: "26 28 20",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderColor: TOP_BORDER,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoChip: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: 36, height: 36, objectFit: "contain" },
  logoInitiales: { fontFamily: "Fraunces", fontWeight: 700, fontSize: 15, color: NUIT },
  brandTexte: { flexDirection: "column", gap: 4 },
  brandNom: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 15, color: "#ffffff" },
  brandMeta: { fontSize: 9, color: MUTED },

  devisWordmark: { alignItems: "flex-end" },
  devisWord: { fontFamily: "Fraunces", fontWeight: 900, fontSize: 34, color: OR, marginBottom: 6 },
  devisNumero: { fontFamily: "JetBrains Mono", fontSize: 8, color: MUTED },

  contenu: { padding: "24 28", flexGrow: 1 },

  clientLabel: {
    fontFamily: "JetBrains Mono",
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: OR,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  clientNom: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 15, color: "#ffffff" },
  clientAdresse: { fontSize: 9.5, color: MUTED, marginTop: 3 },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderColor: LIGNE_OR,
    paddingBottom: 8,
    marginTop: 20,
  },
  tableHeaderTexte: { fontSize: 8.5, fontWeight: 700, color: OR, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: LIGNE,
    paddingVertical: 11,
  },
  colDescription: { width: "44%" },
  colQuantite: { width: "16%", textAlign: "right" },
  colPrixUnitaire: { width: "20%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },

  blocTotaux: { alignSelf: "flex-end", width: 230, marginTop: 14, gap: 5 },
  ligneTotal: { flexDirection: "row", justifyContent: "space-between", fontSize: 10.5, color: MUTED_DOUX },
  vatNote: {
    fontSize: 9,
    fontWeight: 700,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: OR,
    color: TEXTE,
    padding: 7,
    borderRadius: 3,
    marginVertical: 3,
  },
  totalTTC: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: OR,
    borderRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  totalTTCLabel: {
    fontFamily: "Fraunces",
    fontSize: 9.5,
    color: "rgba(13,27,42,0.65)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalTTCValeur: { fontFamily: "Fraunces", fontWeight: 800, fontSize: 19, color: NUIT },

  footnotes: { flexDirection: "row", gap: 24, marginTop: 26 },
  footnote: { width: "50%" },
  footnoteTitre: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    letterSpacing: 1.2,
    color: MUTED,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  footnoteTexte: { fontSize: 9, color: MUTED_DOUX, lineHeight: 1.5 },

  signature: { flexDirection: "row", gap: 22, marginTop: 30 },
  signatureSlot: { width: "50%" },
  signatureEspace: { height: 40, alignItems: "center", justifyContent: "flex-end" },
  signatureCard: { backgroundColor: "#ffffff", borderRadius: 6, padding: 4 },
  signatureImage: { height: 36, objectFit: "contain" },
  signatureLigne: { borderTopWidth: 1, borderColor: ARDOISE },
  signatureLabel: { fontFamily: "JetBrains Mono", fontSize: 8, color: MUTED, paddingTop: 5 },
  signeBadge: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    fontWeight: 700,
    color: "#3ed598",
    paddingTop: 5,
  },

  pied: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: TOP_BORDER,
  },
  piedLegal: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
    marginBottom: 4,
  },
  piedBrand: { fontSize: 7.5, color: MUTED },
  piedBrandNom: { color: OR, fontWeight: 700 },
});

function formaterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
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

interface DevisPdfProps {
  entreprise: {
    nom?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    logoUrl?: string | null;
    siret?: string | null;
    numeroTva?: string | null;
    iban?: string | null;
    conditionsPaiement?: string | null;
    mentionsLegales?: string | null;
  };
  clientNom: string;
  clientAdresse?: string | null;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  totalHT: number;
  tauxTva: number;
  date: Date;
  signatureUrl?: string | null;
  signeLe?: Date | null;
  type?: "devis" | "facture";
  numero?: number | null;
}

export function DevisPDF({
  entreprise,
  clientNom,
  clientAdresse,
  description,
  quantite,
  unite,
  prixUnitaire,
  totalHT,
  tauxTva,
  date,
  signatureUrl,
  signeLe,
  type = "devis",
  numero,
}: DevisPdfProps) {
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;
  const estFacture = type === "facture";
  const motDocument = estFacture ? "Facture" : "Devis";

  const infosPied = [
    entreprise.nom,
    entreprise.siret ? `SIRET ${entreprise.siret}` : null,
    entreprise.numeroTva ? `TVA intracom. ${entreprise.numeroTva}` : null,
    entreprise.iban ? `IBAN ${entreprise.iban}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <View style={styles.logoChip}>
              {entreprise.logoUrl ? (
                <Image src={entreprise.logoUrl} style={styles.logoImage} />
              ) : (
                <Text style={styles.logoInitiales}>{initiales(entreprise.nom || "?")}</Text>
              )}
            </View>
            <View style={styles.brandTexte}>
              {entreprise.nom ? <Text style={styles.brandNom}>{entreprise.nom}</Text> : null}
              <Text style={styles.brandMeta}>
                {[entreprise.adresse, entreprise.telephone].filter(Boolean).join("  ·  ")}
              </Text>
            </View>
          </View>

          <View style={styles.devisWordmark}>
            <Text style={styles.devisWord}>{motDocument}</Text>
            <Text style={styles.devisNumero}>
              N° {numero ?? numeroDocument(date, estFacture ? "FAC" : "DEV")} · {formaterDate(date)}
            </Text>
          </View>
        </View>

        <View style={styles.contenu}>
          <View>
            <Text style={styles.clientLabel}>{motDocument} adressé{estFacture ? "e" : ""} à</Text>
            <Text style={styles.clientNom}>{clientNom}</Text>
            {clientAdresse ? <Text style={styles.clientAdresse}>{clientAdresse}</Text> : null}
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderTexte, styles.colDescription]}>Désignation</Text>
            <Text style={[styles.tableHeaderTexte, styles.colQuantite]}>Quantité</Text>
            <Text style={[styles.tableHeaderTexte, styles.colPrixUnitaire]}>Prix unit. HT</Text>
            <Text style={[styles.tableHeaderTexte, styles.colTotal]}>Total HT</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>{description}</Text>
            <Text style={styles.colQuantite}>
              {quantite} {unite}
            </Text>
            <Text style={styles.colPrixUnitaire}>{prixUnitaire.toFixed(2)} €</Text>
            <Text style={styles.colTotal}>{totalHT.toFixed(2)} €</Text>
          </View>

          <View style={styles.blocTotaux}>
            <View style={styles.ligneTotal}>
              <Text>Total HT</Text>
              <Text>{totalHT.toFixed(2)} €</Text>
            </View>
            {tauxTva > 0 ? (
              <View style={styles.ligneTotal}>
                <Text>TVA ({tauxTva}%)</Text>
                <Text>{montantTva.toFixed(2)} €</Text>
              </View>
            ) : (
              <Text style={styles.vatNote}>TVA non applicable, art. 293 B du CGI</Text>
            )}
            <View style={styles.totalTTC}>
              <Text style={styles.totalTTCLabel}>Total TTC</Text>
              <Text style={styles.totalTTCValeur}>{totalTTC.toFixed(2)} €</Text>
            </View>
          </View>

          <View style={styles.footnotes}>
            {entreprise.conditionsPaiement ? (
              <View style={styles.footnote}>
                <Text style={styles.footnoteTitre}>Conditions de paiement</Text>
                <Text style={styles.footnoteTexte}>{entreprise.conditionsPaiement}</Text>
              </View>
            ) : (
              <View style={styles.footnote} />
            )}
            {entreprise.mentionsLegales ? (
              <View style={styles.footnote}>
                <Text style={styles.footnoteTitre}>Mentions légales</Text>
                <Text style={styles.footnoteTexte}>{entreprise.mentionsLegales}</Text>
              </View>
            ) : (
              <View style={styles.footnote} />
            )}
          </View>

          {estFacture ? (
            <Text style={[styles.footnoteTexte, { marginTop: 26 }]}>Merci pour votre confiance.</Text>
          ) : (
            <View style={styles.signature}>
              <View style={styles.signatureSlot}>
                <View style={styles.signatureEspace} />
                <View style={styles.signatureLigne} />
                {signeLe ? (
                  <Text style={styles.signeBadge}>Signé le {formaterDate(signeLe)}</Text>
                ) : (
                  <Text style={styles.signatureLabel}>Date</Text>
                )}
              </View>
              <View style={styles.signatureSlot}>
                <View style={styles.signatureEspace}>
                  {signatureUrl ? (
                    <View style={styles.signatureCard}>
                      <Image src={signatureUrl} style={styles.signatureImage} />
                    </View>
                  ) : null}
                </View>
                <View style={styles.signatureLigne} />
                <Text style={styles.signatureLabel}>Bon pour accord — signature du client</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.pied} fixed>
          <Text style={styles.piedLegal}>{infosPied || " "}</Text>
          <Text style={styles.piedBrand}>
            Propulsé par <Text style={styles.piedBrandNom}>VolpeVox</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}
