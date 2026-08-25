import { NextRequest, NextResponse } from "next/server";
import { getArtisanConnecte, createAdminSupabase } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("Authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan } = resultat;

  const { endpoint } = await req.json();

  if (!endpoint) {
    return NextResponse.json({ erreur: "endpoint requis" }, { status: 400 });
  }

  const supabaseAdmin = createAdminSupabase();
  // Scope sur artisan_id : un artisan ne peut jamais supprimer l'abonnement
  // d'un autre compte, meme en connaissant son endpoint.
  await supabaseAdmin.from("push_subscriptions").delete().eq("artisan_id", artisan.id).eq("endpoint", endpoint);

  return NextResponse.json({ succes: true });
}
