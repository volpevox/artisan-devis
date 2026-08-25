import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { getArtisanConnecte, createAdminSupabase } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("Authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { supabase, artisan } = resultat;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let stripeCustomerId = artisan.stripe_customer_id as string | null;

  if (!stripeCustomerId) {
    const client = await stripe.customers.create({
      email: user?.email || undefined,
      metadata: { artisan_id: artisan.id },
    });
    stripeCustomerId = client.id;

    const supabaseAdmin = createAdminSupabase();
    await supabaseAdmin.from("artisans").update({ stripe_customer_id: stripeCustomerId }).eq("id", artisan.id);
  }

  // Offre decouverte (45€/mois les 12 premiers mois) reservee aux 20
  // premiers artisans inscrits : le coupon Stripe porte lui-meme cette
  // limite (max_redemptions), on l'applique tant qu'il est encore valide.
  let coupon = null;
  if (process.env.STRIPE_COUPON_DECOUVERTE_ID) {
    try {
      const c = await stripe.coupons.retrieve(process.env.STRIPE_COUPON_DECOUVERTE_ID);
      if (c.valid) coupon = c;
    } catch {
      coupon = null;
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: { trial_period_days: 21 },
    ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
    success_url: `${req.nextUrl.origin}/abonnement/succes`,
    cancel_url: `${req.nextUrl.origin}/abonnement`,
    metadata: { artisan_id: artisan.id },
  });

  return NextResponse.json({ url: session.url });
}
