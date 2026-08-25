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
      const userId = session.metadata?.user_id;
      if (userId && typeof session.subscription === "string" && typeof session.customer === "string") {
        const abonnement = await stripe.subscriptions.retrieve(session.subscription);
        const infosAbonnement = {
          abonnement_actif: true,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          essai_expire_le: abonnement.trial_end ? new Date(abonnement.trial_end * 1000).toISOString() : null,
        };

        // La ligne "artisans" n'existe pas forcement encore : c'est ici,
        // seulement une fois l'abonnement reellement demarre, qu'elle est
        // creee pour un premier abonnement. Pour une reactivation, la ligne
        // existe deja (voir /api/creer-abonnement) -- on la met a jour.
        const { data: artisanExistant } = await supabaseAdmin
          .from("artisans")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (artisanExistant) {
          await supabaseAdmin.from("artisans").update(infosAbonnement).eq("id", artisanExistant.id);
        } else {
          await supabaseAdmin.from("artisans").insert({ user_id: userId, ...infosAbonnement });
        }
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
