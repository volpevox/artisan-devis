import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServerClient";

// Active un acces gratuit et permanent (sans passer par Stripe) pour les
// personnes explicitement autorisees par Marley (amis, beta-testeurs,
// artisans en essai gratuit). L'email verifie est celui de la session
// authentifiee cote serveur -- jamais un parametre transmis par le client --
// pour rester fiable meme quand l'app est relancee depuis l'ecran d'accueil
// sur iOS (un code transmis via l'URL s'y perdait, voir l'ancienne version
// de cette route et de app/connexion/page.tsx).
//
// La liste d'emails autorises vit dans la table Supabase acces_gratuit_emails
// (voir supabase/acces-gratuit-emails.sql) : l'ajouter/retirer se fait dans
// le Table Editor Supabase, effet immediat, aucun redeploiement Vercel.
// L'ancienne variable Vercel EMAILS_ACCES_GRATUIT reste lue en complement
// pendant la transition -- une fois tous les emails repris dans la table,
// elle peut etre supprimee de Vercel.
//
// Cette route ne fait qu'ACCORDER l'acces (abonnement_actif = true), jamais
// le retirer : retirer un email de la table ne revoque donc pas un acces
// deja accorde (le faire a la main dans Supabase si besoin -- snippet en bas
// du fichier SQL).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  }

  const supabase = createServerSupabase(authHeader);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ erreur: "Session invalide ou expirée" }, { status: 401 });
  }

  const emailUtilisateur = user.email.toLowerCase();
  const supabaseAdmin = createAdminSupabase();

  // Liste principale : table Supabase acces_gratuit_emails (editable sans
  // redeploiement). Si la table n'existe pas encore (SQL pas encore joue),
  // la requete echoue sans casser -- on se rabat alors sur la variable Vercel.
  const { data: ligneAcces } = await supabaseAdmin
    .from("acces_gratuit_emails")
    .select("email")
    .eq("email", emailUtilisateur)
    .eq("actif", true)
    .maybeSingle();

  // Complement transitoire : ancienne variable Vercel EMAILS_ACCES_GRATUIT.
  const emailsVercel = (process.env.EMAILS_ACCES_GRATUIT || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const autorise = Boolean(ligneAcces) || emailsVercel.includes(emailUtilisateur);

  if (!autorise) {
    return NextResponse.json({ ok: false });
  }

  const { data: artisanExistant } = await supabaseAdmin
    .from("artisans")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (artisanExistant) {
    await supabaseAdmin.from("artisans").update({ abonnement_actif: true }).eq("id", artisanExistant.id);
  } else {
    await supabaseAdmin.from("artisans").insert({ user_id: user.id, abonnement_actif: true });
  }

  return NextResponse.json({ ok: true });
}
