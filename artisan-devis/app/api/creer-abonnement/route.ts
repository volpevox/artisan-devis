import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { createServerSupabase } from "@/lib/supabaseServerClient";
import { MODE_GRATUIT } from "@/lib/modeGratuit";

export async function POST(req: NextRequest) {
  // Garde-fou : en mode "gratuit pendant le lancement", il n'y a plus de
  // parcours d'abonnement. L'interface ne propose plus ce bouton, mais on
  // bloque aussi cote serveur au cas ou.
  if (MODE_GRATUIT) {
    return NextResponse.json(
      { erreur: "VolpeVox est gratuit pendant le lancement : aucun abonnement à souscrire." },
      { status: 400 }
    );
  }

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

  // Pas de ligne "artisans" a ce stade pour un premier abonnement : elle
  // n'est creee qu'une fois l'abonnement Stripe reellement demarre (voir le
  // webhook Stripe), pour ne pas polluer la base avec des comptes crees puis
  // jamais abonnes. Si l'artisan reactive un abonnement resilie, sa ligne
  // existe deja -- on reutilise alors son stripe_customer_id.
  const { data: artisanExistant } = await supabase
    .from("artisans")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let stripeCustomerId = artisanExistant?.stripe_customer_id as string | null | undefined;

  if (!stripeCustomerId) {
    const client = await stripe.customers.create({
      email: user.email || undefined,
      metadata: { user_id: user.id },
    });
    stripeCustomerId = client.id;
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
    subscription_data: { trial_period_days: 14 },
    ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
    success_url: `${req.nextUrl.origin}/profil?bienvenue=1`,
    cancel_url: `${req.nextUrl.origin}/abonnement`,
    metadata: { user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
