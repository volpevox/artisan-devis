import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServerClient";

// Active un acces gratuit et permanent (sans passer par Stripe) pour les
// personnes dont l'email figure dans la liste privee EMAILS_ACCES_GRATUIT
// (amis, beta-testeurs choisis par Marley). L'email verifie est celui de la
// session authentifiee cote serveur -- jamais un parametre transmis par le
// client -- pour rester fiable meme quand l'app est relancee depuis l'ecran
// d'accueil sur iOS (un code transmis via l'URL s'y perdait, voir l'ancienne
// version de cette route et de app/connexion/page.tsx).
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

  const emailsAutorises = (process.env.EMAILS_ACCES_GRATUIT || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!emailsAutorises.includes(user.email.toLowerCase())) {
    return NextResponse.json({ ok: false });
  }

  const supabaseAdmin = createAdminSupabase();

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
