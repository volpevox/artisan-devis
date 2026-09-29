// SIREN du client (mention obligatoire sur les factures B2B, reforme de la
// facturation electronique). Saisie tolerante : espaces/points acceptes, et
// un SIRET (14 chiffres) colle par erreur est ramene a son SIREN (les 9
// premiers chiffres). Renvoie null si le champ est vide, "invalide" si la
// saisie ne ressemble ni a un SIREN ni a un SIRET.
export function normaliserSiren(saisie: string | null | undefined): string | null | "invalide" {
  const chiffres = (saisie || "").replace(/[\s.\-]/g, "");
  if (!chiffres) return null;
  if (!/^\d+$/.test(chiffres)) return "invalide";
  if (chiffres.length === 9) return chiffres;
  if (chiffres.length === 14) return chiffres.slice(0, 9);
  return "invalide";
}

// "123456789" -> "123 456 789"
export function formaterSiren(siren: string): string {
  return siren.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");
}
