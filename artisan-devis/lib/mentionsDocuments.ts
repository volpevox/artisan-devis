// Mention par defaut des penalites de retard, affichee sur les factures
// quand l'artisan n'a pas saisi sa propre formulation (champ
// "penalites_retard" du profil). Reprend la formulation legale standard
// entre professionnels (art. L441-10 du Code de commerce).
export const MENTION_PENALITES_RETARD_DEFAUT =
  "En cas de retard de paiement, une pénalité calculée au taux d'intérêt légal en vigueur majoré de 10 points sera appliquée, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (article L441-10 du Code de commerce).";

// Client particulier : l'indemnite forfaitaire de 40 EUR ne s'applique
// qu'entre professionnels. Seuls les interets au taux legal sont dus, apres
// mise en demeure (art. 1231-6 du Code civil).
export const MENTION_PENALITES_RETARD_PARTICULIER =
  "En cas de retard de paiement, des intérêts au taux légal pourront être appliqués après mise en demeure (article 1231-6 du Code civil).";

// Devis a un particulier : signe a distance (lien par email) ou chez lui,
// le contrat ouvre droit a 14 jours de retractation (art. L221-18 du Code
// de la consommation). Formulaire type en 2e page du devis.
export const MENTION_RETRACTATION =
  "Si ce contrat est conclu à distance ou hors établissement, vous disposez d'un délai de 14 jours à compter de sa signature pour vous rétracter, sans avoir à vous justifier, au moyen du formulaire joint ou de toute autre déclaration dénuée d'ambiguïté (articles L221-18 et suivants du Code de la consommation). Si vous demandez que la prestation commence avant la fin de ce délai, vous paierez, en cas de rétractation, la part de prestation déjà réalisée.";
