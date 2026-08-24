import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { getArtisanConnecte, createAdminSupabase } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("Authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan } = resultat;

  if (!artisan.stripe_account_id) {
    return NextResponse.json({ actif: false });
  }

  try {
    const compte = await stripe.v2.core.accounts.retrieve(artisan.stripe_account_id, {
      include: ["configuration.merchant"],
    });

    const actif = compte.configuration?.merchant?.capabilities?.card_payments?.status === "active";

    if (actif !== artisan.stripe_paiement_actif) {
      const supabaseAdmin = createAdminSupabase();
      await supabaseAdmin.from("artisans").update({ stripe_paiement_actif: actif }).eq("id", artisan.id);
    }

    return NextResponse.json({ actif });
  } catch (e: any) {
    return NextResponse.json({ erreur: e.message || "Erreur inconnue" }, { status: 500 });
  }
}
