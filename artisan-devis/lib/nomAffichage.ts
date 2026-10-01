interface ProfilPourNom {
  taux_tva?: number | string | null;
  nom_complet?: string | null;
  nom_entreprise?: string | null;
  est_societe?: boolean | null;
  forme_capital?: string | null;
  rcs_ville?: string | null;
}

// En societe : le nom de l'entreprise (raison sociale) seul. A son nom
// (micro, EI) : nom et prenom, complete par le nom d'entreprise s'il est
// renseigne.
//
// Comptes qui n'ont pas encore repondu a la question "A ton nom / En
// societe" (est_societe vide) : ancienne regle, devinee d'apres la TVA. Un
// taux a 0% indique le plus souvent une franchise en base (nom propre), un
// taux superieur une societe.
export function estEnSociete(profil: ProfilPourNom | null | undefined) {
  if (profil?.est_societe === true || profil?.est_societe === false) return profil.est_societe;
  return (Number(profil?.taux_tva) || 0) > 0;
}

export function nomAffichageDocument(profil: ProfilPourNom | null | undefined) {
  const nomEntreprise = profil?.nom_entreprise?.trim();
  const nomComplet = profil?.nom_complet?.trim();

  if (estEnSociete(profil)) {
    return nomEntreprise || nomComplet || "";
  }

  return [nomComplet, nomEntreprise].filter(Boolean).join(" — ");
}

// Mentions propres aux societes, au pied des documents :
// "SARL au capital de 5 000 € · RCS Lyon". Rien pour un artisan a son nom.
export function mentionSociete(profil: ProfilPourNom | null | undefined) {
  if (profil?.est_societe !== true) return null;
  const rcs = profil.rcs_ville?.trim();
  return [profil.forme_capital?.trim(), rcs ? `RCS ${rcs}` : null].filter(Boolean).join(" · ") || null;
}

// Nom court pour l'expediteur des mails ("Plomberie Durand via VolpeVox") :
// le nom de l'entreprise s'il existe, sinon prenom et nom. Le nom long des
// documents ("Jean Durand — Plomberie Durand") est trop long pour un "De :".
export function nomCourt(profil: ProfilPourNom | null | undefined) {
  return profil?.nom_entreprise?.trim() || profil?.nom_complet?.trim() || "";
}
