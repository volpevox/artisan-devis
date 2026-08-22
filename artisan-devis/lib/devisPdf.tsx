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

const INK = "#103362";
const INK_SOFT = "#1c5aa3";
const OR = "#c9a154";
const OR_DOUX = "#f3e8d2";
const TEXTE = "#211d2b";
const SOMBRE = "#2a2730";
const LIGNE = "#eae7f0";

const styles = StyleSheet.create({
  page: { fontFamily: "Archivo", fontSize: 10, color: TEXTE },

  masthead: {
    backgroundColor: INK,
    color: "#fff",
    padding: 28,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoChip: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: 40, height: 40, objectFit: "contain" },
  logoInitiales: { fontFamily: "Fraunces", fontWeight: 700, fontSize: 16, color: INK },
  brandTexte: { flexDirection: "column", gap: 4 },
  brandNom: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 16 },
  brandMeta: { fontSize: 9.5, color: "#ffffff" },

  devisWordmark: { alignItems: "flex-end" },
  devisWord: { fontFamily: "Fraunces", fontWeight: 900, fontSize: 38, color: "#fff", marginBottom: 8 },
  devisPill: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  devisPillTexte: { fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 8.5, color: OR },
  devisPillDate: { fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 8.5, color: "#ffffff" },

  contenu: { padding: 28, paddingTop: 22, flexGrow: 1 },

  clientLabel: {
    fontFamily: "JetBrains Mono",
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: SOMBRE,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  clientNom: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 15 },
  clientAdresse: { fontSize: 9.5, color: SOMBRE, marginTop: 3 },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: INK,
    paddingBottom: 8,
    marginTop: 20,
  },
  tableHeaderTexte: { fontSize: 8.5, fontWeight: 700, color: INK, textTransform: "uppercase" },
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
  ligneTotal: { flexDirection: "row", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: INK },
  vatNote: {
    fontSize: 9,
    fontWeight: 700,
    backgroundColor: OR_DOUX,
    borderWidth: 1,
    borderColor: OR,
    color: INK,
    padding: 7,
    borderRadius: 3,
    marginVertical: 3,
  },
  totalTTC: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: INK,
    borderRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  totalTTCLabel: {
    fontFamily: "Fraunces",
    fontSize: 9.5,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalTTCValeur: { fontFamily: "Fraunces", fontWeight: 800, fontSize: 19, color: OR },

  footnotes: { flexDirection: "row", gap: 24, marginTop: 26 },
  footnote: { width: "50%" },
  footnoteTitre: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    letterSpacing: 1.2,
    color: SOMBRE,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  footnoteTexte: { fontSize: 9, color: TEXTE, lineHeight: 1.5 },

  signature: { flexDirection: "row", gap: 22, marginTop: 30 },
  signatureSlot: { width: "50%" },
  signatureEspace: { height: 40, alignItems: "center", justifyContent: "flex-end" },
  signatureImage: { height: 40, objectFit: "contain" },
  signatureLigne: { borderTopWidth: 1, borderColor: LIGNE },
  signatureLabel: { fontFamily: "JetBrains Mono", fontSize: 8, color: SOMBRE, paddingTop: 5 },
  signeBadge: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    fontWeight: 700,
    color: "#1a7a3c",
    paddingTop: 5,
  },

  pied: {
    backgroundColor: INK,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  piedLegal: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 4,
  },
  piedBrand: { fontSize: 7.5, color: "#ffffff" },
  piedBrandNom: { color: OR, fontWeight: 700 },
});

function formaterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

function numeroDevis(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `DEV-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes()
  )}`;
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
}: DevisPdfProps) {
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;

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
        <View style={styles.masthead}>
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
            <Text style={styles.devisWord}>Devis</Text>
            <View style={styles.devisPill}>
              <Text style={styles.devisPillTexte}>N° {numeroDevis(date)}</Text>
              <Text style={styles.devisPillDate}>· {formaterDate(date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.contenu}>
          <View>
            <Text style={styles.clientLabel}>Devis adressé à</Text>
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
                {signatureUrl ? <Image src={signatureUrl} style={styles.signatureImage} /> : null}
              </View>
              <View style={styles.signatureLigne} />
              <Text style={styles.signatureLabel}>Bon pour accord — signature du client</Text>
            </View>
          </View>
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
