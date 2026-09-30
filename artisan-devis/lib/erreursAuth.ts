// Traduit en francais les erreurs renvoyees par Supabase Auth (connexion,
// inscription, mot de passe oublie), qui arrivent en anglais.
// On regarde d'abord le code d'erreur, puis le texte anglais (les anciennes
// versions de Supabase n'envoient pas toujours de code).

const PAR_CODE: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect.",
  email_not_confirmed: "Ton adresse email n'est pas encore confirmée. Clique sur le lien reçu par email (pense aux spams).",
  user_already_exists: "Un compte existe déjà avec cet email. Connecte-toi, ou utilise « Mot de passe oublié ».",
  email_exists: "Un compte existe déjà avec cet email. Connecte-toi, ou utilise « Mot de passe oublié ».",
  weak_password: "Mot de passe trop faible : au moins 6 caractères.",
  same_password: "Le nouveau mot de passe doit être différent de l'ancien.",
  email_address_invalid: "Adresse email invalide.",
  validation_failed: "Vérifie ton email et ton mot de passe.",
  over_email_send_rate_limit: "Trop d'emails envoyés. Réessaie dans quelques minutes.",
  over_request_rate_limit: "Trop de tentatives. Réessaie dans quelques minutes.",
  signup_disabled: "Les inscriptions sont momentanément fermées.",
  user_banned: "Ce compte est suspendu. Contacte-nous sur WhatsApp.",
  session_expired: "Ta session a expiré. Reconnecte-toi.",
};

const PAR_TEXTE: [RegExp, string][] = [
  [/invalid login credentials/i, PAR_CODE.invalid_credentials],
  [/email not confirmed/i, PAR_CODE.email_not_confirmed],
  [/already registered|already exists/i, PAR_CODE.user_already_exists],
  [/password should be at least|password is too weak|weak password/i, PAR_CODE.weak_password],
  [/should be different from the old password/i, PAR_CODE.same_password],
  [/invalid format|invalid email|email address .* is invalid/i, PAR_CODE.email_address_invalid],
  [/missing email|anonymous sign-ins are disabled|password is required|email is required/i, "Remplis ton email et ton mot de passe."],
  [/you can only request this after|rate limit|too many requests/i, PAR_CODE.over_request_rate_limit],
  [/signups not allowed/i, PAR_CODE.signup_disabled],
  [/failed to fetch|network/i, "Problème de connexion internet. Vérifie ton réseau et réessaie."],
];

export function erreurAuthEnFrancais(erreur: { code?: string; message?: string } | null | undefined): string {
  if (!erreur) return "Une erreur est survenue. Réessaie.";
  if (erreur.code && PAR_CODE[erreur.code]) return PAR_CODE[erreur.code];
  const texte = erreur.message || "";
  for (const [motif, traduction] of PAR_TEXTE) {
    if (motif.test(texte)) return traduction;
  }
  return "Une erreur est survenue. Réessaie dans un instant.";
}
