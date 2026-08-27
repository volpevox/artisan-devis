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
// Cette route ACCORDE l'acces (abonnement_actif = true) si l'email est dans
// la liste, et le RETIRE si l'email n'y est plus -- mais uniquement pour un
// compte issu de l'acces gratuit (ligne artisans sans stripe_subscription_id).
// Un vrai client Stripe (abonnement paye ou en essai) n'est jamais touche.
// Appelee a l'inscription (app/connexion) ET a chaque ouverture de l'appli
// (lib/useArtisan) : retirer un email de la table revoque donc l'acces a la
// prochaine ouverture, et l'artisan tombe sur la page /abonnement.
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

  const { data: artisanExistant } = await supabaseAdmin
    .from("artisans")
    .select("id, abonnement_actif, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (autorise) {
    if (artisanExistant) {
      if (!artisanExistant.abonnement_actif) {
        await supabaseAdmin.from("artisans").update({ abonnement_actif: true }).eq("id", artisanExistant.id);
      }
    } else {
      await supabaseAdmin.from("artisans").insert({ user_id: user.id, abonnement_actif: true });
    }
    return NextResponse.json({ ok: true });
  }

  // Email plus dans la liste : on revoque, mais SEULEMENT si ce compte vient
  // de l'acces gratuit (ligne artisans existante, sans abonnement Stripe) et
  // qu'il est encore marque actif. Un client Stripe (stripe_subscription_id
  // renseigne) ou un simple visiteur sans ligne artisans ne sont pas touches.
  if (
    artisanExistant &&
    artisanExistant.abonnement_actif &&
    !artisanExistant.stripe_subscription_id
  ) {
    await supabaseAdmin.from("artisans").update({ abonnement_actif: false }).eq("id", artisanExistant.id);
  }

  return NextResponse.json({ ok: false });
}
