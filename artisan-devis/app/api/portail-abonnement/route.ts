import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { getArtisanConnecte } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("Authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan } = resultat;

  if (!artisan.stripe_customer_id) {
    return NextResponse.json({ erreur: "Aucun abonnement Stripe associe a ce profil" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: artisan.stripe_customer_id,
    return_url: `${req.nextUrl.origin}/profil`,
  });

  return NextResponse.json({ url: session.url });
}
