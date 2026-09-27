// Majorations nuit / dimanche / jour ferie (colonnes artisans.majoration_*,
// reglees dans « Mes tarifs »). L'IA repere seulement les cas dans la
// dictee (/api/structurer) ; le calcul est fait ici, pas par l'IA.
// Les majorations s'additionnent : nuit + dimanche = 10 + 10 = +20 %.

export type TypeMajoration = "nuit" | "dimanche" | "ferie";

const LIBELLES: Record<TypeMajoration, string> = {
  nuit: "nuit",
  dimanche: "dimanche",
  ferie: "jour férié",
};

export interface TauxMajorations {
  majoration_nuit?: number | null;
  majoration_dimanche?: number | null;
  majoration_ferie?: number | null;
}

function taux(artisan: TauxMajorations, type: TypeMajoration): number {
  const valeur = {
    nuit: artisan.majoration_nuit ?? 10,
    dimanche: artisan.majoration_dimanche ?? 10,
    ferie: artisan.majoration_ferie ?? 100,
  }[type];
  return Number(valeur) || 0;
}

function casValides(types: unknown): TypeMajoration[] {
  return (Array.isArray(types) ? types : []).filter(
    (t, i, tous): t is TypeMajoration => typeof t === "string" && t in LIBELLES && tous.indexOf(t) === i
  );
}

// Renvoie le prix majore (arrondi au centime) et le texte a ajouter a la
// description, ex : "majoration nuit +10 % et dimanche +10 %". Sans
// majoration applicable (aucun cas, ou taux a 0), renvoie le prix tel quel.
export function appliquerMajorations(
  prixBase: number,
  types: unknown,
  artisan: TauxMajorations
): { prix: number; texte: string } {
  const appliques = casValides(types).filter((t) => taux(artisan, t) > 0);
  if (appliques.length === 0) return { prix: prixBase, texte: "" };

  const total = appliques.reduce((s, t) => s + taux(artisan, t), 0);
  const detail = appliques
    .map((t) => `${LIBELLES[t]} +${String(taux(artisan, t)).replace(".", ",")} %`)
    .join(" et ");
  return {
    prix: Math.round(prixBase * (1 + total / 100) * 100) / 100,
    texte: `majoration ${detail}`,
  };
}

// Transforme une ligne renvoyee par l'IA (/api/structurer) en ligne du
// formulaire. Regle simple et previsible :
// - prix DICTE -> pris tel quel, sans majoration (l'artisan sait ce qu'il dit) ;
// - sinon tarif du CARNET + majorations de l'artisan.
export function finaliserLigneIA(l: any, artisan: TauxMajorations) {
  const dicte = Number(l?.prixDicte) || null;
  const carnet = dicte ? null : Number(l?.prixCarnet) || null;
  const ligne = {
    ...l,
    prixUnitaire: dicte ?? carnet,
    prixPropose: Boolean(carnet),
    // Un prix de nuit / dimanche / ferie n'est pas appris : il fausserait le
    // tarif de base du carnet (apprendrePrix ignore une prestation vide).
    prestation: casValides(l?.majorations).length > 0 ? "" : l?.prestation || "",
  };
  if (!carnet) return ligne;

  const { prix, texte } = appliquerMajorations(carnet, l?.majorations, artisan);
  if (!texte) return ligne;
  return { ...ligne, prixUnitaire: prix, description: `${l?.description || ""} (${texte})`.trim() };
}
