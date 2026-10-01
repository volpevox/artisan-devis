import { createServerSupabase } from "@/lib/supabaseServerClient";

// Verifie, COTE SERVEUR, que la session envoyee est celle de Marley.
// L'email admin vit dans la variable d'environnement ADMIN_EMAIL (Vercel +
// .env.local), jamais dans le code. Sans variable, personne n'est admin.
// A n'importer que depuis des routes API (jamais depuis une page "use client").
export async function estAdmin(authHeader: string | null) {
  const emailAdmin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!emailAdmin || !authHeader) return false;

  const {
    data: { user },
  } = await createServerSupabase(authHeader).auth.getUser();

  // email_confirmed_at : un compte cree avec cet email mais jamais confirme
  // (donc pas forcement le sien) ne doit pas etre admin.
  return Boolean(user?.email && user.email_confirmed_at && user.email.toLowerCase() === emailAdmin);
}
