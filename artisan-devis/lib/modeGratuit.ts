// Interrupteur global : "VolpeVox est gratuit pendant le lancement".
//
// Piloté par la variable d'environnement Vercel NEXT_PUBLIC_MODE_GRATUIT :
//   - "true"            -> mode gratuit : inscription sans carte bancaire, aucune
//                          page de prix, aucun bouton "s'abonner". Chaque nouvel
//                          inscrit est ajouté à acces_gratuit_emails (journal daté)
//                          et son accès est ouvert immédiatement.
//   - "false" ou absente -> parcours payant Stripe normal (comportement d'origine).
//
// Repasser en payant = mettre la variable à "false" et redéployer. Les personnes
// déjà inscrites restent dans acces_gratuit_emails : elles gardent leur accès
// (à convertir/retirer manuellement en SQL le moment venu, au choix de Marley).
export const MODE_GRATUIT = process.env.NEXT_PUBLIC_MODE_GRATUIT === "true";
