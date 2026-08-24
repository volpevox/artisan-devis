interface ProfilPourNom {
  taux_tva?: number | string | null;
  nom_complet?: string | null;
  nom_entreprise?: string | null;
}

// Un taux de TVA a 0% indique le plus souvent une franchise en base
// (auto-entrepreneur en nom propre) : on affiche alors le nom et prenom,
// complete par le nom d'entreprise s'il est renseigne. Un taux superieur a
// 0% indique le plus souvent une societe en raison sociale : on affiche
// alors seulement le nom d'entreprise (ou le nom et prenom en secours s'il
// n'est pas renseigne).
export function nomAffichageDocument(profil: ProfilPourNom | null | undefined) {
  const tauxTva = Number(profil?.taux_tva) || 0;
  const nomEntreprise = profil?.nom_entreprise?.trim();
  const nomComplet = profil?.nom_complet?.trim();

  if (tauxTva > 0) {
    return nomEntreprise || nomComplet || "";
  }

  return [nomComplet, nomEntreprise].filter(Boolean).join(" — ");
}
