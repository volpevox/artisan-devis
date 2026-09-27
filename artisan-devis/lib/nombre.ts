// Convertit une saisie en nombre en acceptant la virgule francaise (le
// clavier numerique iPhone en francais propose "," et pas ".") et les
// espaces : "1 250,50" -> 1250.5. Saisie vide ou invalide -> 0.
export function enNombre(saisie: string | number): number {
  const n = Number(String(saisie).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
