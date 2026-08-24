import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripeClient";
import { createAdminSupabase } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const corpsBrut = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(corpsBrut, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ erreur: "Signature Stripe invalide" }, { status: 400 });
  }

  const supabaseAdmin = createAdminSupabase();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const artisanId = session.metadata?.artisan_id;
      if (artisanId && typeof session.subscription === "string") {
        await supabaseAdmin
          .from("artisans")
          .update({ abonnement_actif: true, stripe_subscription_id: session.subscription })
          .eq("id", artisanId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const actif = subscription.status === "active" || subscription.status === "trialing";
      await supabaseAdmin
        .from("artisans")
        .update({ abonnement_actif: actif })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }
  }

  return NextResponse.json({ recu: true });
}
