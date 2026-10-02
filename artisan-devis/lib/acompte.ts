// Facture d'acompte (supabase/acompte.sql) : un seul acompte par devis signe,
// stocke sur la ligne du devis comme l'avoir. Numero pris dans la meme suite
// que les factures (une facture d'acompte EST une facture). La facture finale
// rappelle l'acompte et le deduit : le client ne paie plus que le reste.

const arrondi = (n: number) => Math.round(n * 100) / 100;

// Lit le pourcentage d'acompte dans les conditions de paiement de l'artisan
// (Mon compte), pour pre-remplir « Demander un acompte » :
//   « Acompte 30 % à la commande »      -> 30
//   « 40% d'acompte à la signature »    -> 40
//   « acompte de 33,5 % »               -> 33.5
// Pas de mot « acompte » ou pas de pourcentage : null (l'artisan saisit).
// Seul un pourcentage de la meme phrase que le mot « acompte » compte
// (« Remise 10 %. Acompte 50 % » -> 50, pas 10).
export function pourcentageAcompte(conditions: string | null | undefined): number | null {
  const phrases = String(conditions || "")
    .toLowerCase()
    .split(/[;\n]|[.,](?!\d)/);
  for (const phrase of phrases) {
    if (!phrase.includes("acompte")) continue;
    const m = /(\d{1,3}(?:[.,]\d{1,2})?)\s*%/.exec(phrase);
    const valeur = m ? Number(m[1].replace(",", ".")) : 0;
    if (valeur > 0 && valeur < 100) return valeur;
  }
  return null;
}

// devis.total est stocke HORS TAXE ; tout ce que voit le client est TTC.
export function totalTTCDevis(totalHT: number | null | undefined, tauxTva: number) {
  return arrondi((Number(totalHT) || 0) * (1 + tauxTva / 100));
}

// Montant TTC de l'acompte, toujours recalcule depuis un hors-taxe arrondi
// au centime : le PDF refait « HT + TVA », il doit retomber pile sur le
// meme TTC (sinon 1 centime d'ecart avec la TVA).
export function acompteNormalise(montantTTC: number, tauxTva: number) {
  const ht = arrondi(montantTTC / (1 + tauxTva / 100));
  return { ht, ttc: arrondi(ht * (1 + tauxTva / 100)) };
}

export function acompteDepuisPourcentage(totalHT: number | null | undefined, pourcentage: number, tauxTva: number) {
  const ht = arrondi(((Number(totalHT) || 0) * pourcentage) / 100);
  return arrondi(ht * (1 + tauxTva / 100));
}

// Donnees PDF de la facture d'acompte d'un devis (ligne unique, au HT).
export function pdfAcompte(d: any, tauxTva: number) {
  const pct = Number(d.acompte_pourcentage) || null;
  return {
    lignes: [
      {
        description: `Acompte${pct ? ` de ${String(pct).replace(".", ",")} %` : ""} sur le devis n°${d.numero_devis ?? "—"}`,
        quantite: 1,
        unite: "forfait",
        prixUnitaire: acompteNormalise(Number(d.acompte_montant) || 0, tauxTva).ht,
      },
    ],
    acompteSur: {
      numeroDevis: d.numero_devis ?? null,
      signeLe: d.signe_le ? new Date(d.signe_le) : null,
      totalTTC: totalTTCDevis(d.total, tauxTva),
      pourcentage: pct,
    },
    numero: d.acompte_numero as number,
    date: new Date(d.acompte_cree_le),
    paiement: {
      payeeLe: d.acompte_payee_le ? new Date(d.acompte_payee_le) : null,
      moyenPaiement: d.acompte_moyen_paiement || null,
    },
  };
}

// Facture finale : l'acompte a deduire (null s'il n'y en a pas).
export function acompteDeduit(d: any) {
  return d?.acompte_numero
    ? { numero: d.acompte_numero as number, date: new Date(d.acompte_cree_le), montant: Number(d.acompte_montant) || 0 }
    : null;
}

// Ce que le client doit encore sur la facture finale : total TTC moins
// l'acompte deja facture (qu'il soit deja regle ou pas : la facture
// d'acompte se paie a part).
export function resteAPayer(
  d: { total?: number | null; acompte_numero?: number | null; acompte_montant?: number | null },
  tauxTva: number
) {
  const total = totalTTCDevis(d.total, tauxTva);
  const acompte = d.acompte_numero ? Number(d.acompte_montant) || 0 : 0;
  return arrondi(Math.max(0, total - acompte));
}
