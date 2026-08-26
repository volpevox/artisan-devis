import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServerClient";

// Active un acces gratuit et permanent (sans passer par Stripe) pour un
// artisan qui s'inscrit via le lien d'invitation. Le code secret est verifie
// cote serveur uniquement -- jamais expose au navigateur -- pour qu'on ne
// puisse pas se donner un acces gratuit en devinant/rejouant une requete.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  }

  const supabase = createServerSupabase(authHeader);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erreur: "Session invalide ou expirée" }, { status: 401 });
  }

  const { code } = await req.json();

  if (!process.env.CODE_INVITATION_GRATUITE || code !== process.env.CODE_INVITATION_GRATUITE) {
    return NextResponse.json({ erreur: "Code d'invitation invalide" }, { status: 403 });
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
