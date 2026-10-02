// Moyens de paiement que l'artisan accepte (profil, rubrique Paiement).
// Colonne artisans.moyens_paiement vide (comptes d'avant ce reglage) = les
// trois, comme le mail le proposait jusque-la.
export const MOYENS_PAIEMENT = [
  { valeur: "virement", libelle: "Virement" },
  { valeur: "cheque", libelle: "Chèque" },
  { valeur: "especes", libelle: "Espèces" },
] as const;

export type MoyenPaiement = (typeof MOYENS_PAIEMENT)[number]["valeur"];

export function moyensAcceptes(valeur: unknown): MoyenPaiement[] {
  if (!Array.isArray(valeur)) return MOYENS_PAIEMENT.map((m) => m.valeur);
  return MOYENS_PAIEMENT.map((m) => m.valeur).filter((v) => valeur.includes(v));
}

// "FR7612345..." -> "FR76 1234 5..." (lisible sur le mail et le PDF).
export function formaterIban(iban: unknown) {
  return String(iban || "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}
