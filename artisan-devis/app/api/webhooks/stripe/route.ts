import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { stripe } from "@/lib/stripeClient";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { emailHtml } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

// Adresse ou Marley recoit les notifications d'activite abonnement (nouvel
// essai, essai devenu payant, resiliation). Stripe ne notifie pas les essais
// gratuits (aucun paiement), d'ou cet envoi maison.
const EMAIL_ADMIN = "volpevox@outlook.fr";

// Envoie une notification a Marley. Encapsule dans un try/catch par l'appelant :
// un echec d'email ne doit jamais faire echouer le traitement du webhook (sinon
// Stripe rejoue l'evenement et l'abonnement peut etre traite en double).
async function previnerAdmin(sujet: string, corpsHtml: string) {
  await resend.emails.send({
    from: "VolpeVox <devis@volpevox.fr>",
    to: EMAIL_ADMIN,
    subject: sujet,
    html: emailHtml({ titre: sujet, corpsHtml }),
  });
}

// Recupere l'email du client Stripe a partir de son id, pour l'afficher dans
// la notification. Renvoie une chaine vide si indisponible.
async function emailDuClient(customerId: string | null): Promise<string> {
  if (!customerId) return "";
  try {
    const client = await stripe.customers.retrieve(customerId);
    if (client && !client.deleted) return client.email || "";
  } catch {
    // ignore
  }
  return "";
}

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

        // Notification a Marley : nouvel essai gratuit demarre.
        try {
          const email = session.customer_details?.email || (await emailDuClient(session.customer));
          const finEssai = abonnement.trial_end
            ? new Date(abonnement.trial_end * 1000).toLocaleDateString("fr-FR")
            : null;
          await previnerAdmin(
            "🎉 Nouvel essai gratuit VolpeVox",
            `<p><strong>${email || "Un nouvel artisan"}</strong> vient de démarrer son essai gratuit de 14 jours.</p>` +
              (finEssai ? `<p>Premier prélèvement prévu le <strong>${finEssai}</strong> (sauf résiliation d'ici là).</p>` : "")
          );
        } catch {
          // L'abonnement est enregistre : un echec de notification est sans gravite.
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const avant = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
      const actif = subscription.status === "active" || subscription.status === "trialing";
      await supabaseAdmin
        .from("artisans")
        .update({ abonnement_actif: actif })
        .eq("stripe_subscription_id", subscription.id);

      // Essai devenu payant : le statut passe de "trialing" a "active".
      if (avant?.status === "trialing" && subscription.status === "active") {
        try {
          const email = await emailDuClient(
            typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
          );
          await previnerAdmin(
            "💶 Un essai VolpeVox est devenu payant",
            `<p><strong>${email || "Un artisan"}</strong> a terminé son essai : premier prélèvement effectué, l'abonnement est maintenant actif.</p>`
          );
        } catch {
          // sans gravite
        }
      }

      // Resiliation programmee pour la fin de la periode en cours.
      if (avant && avant.cancel_at_period_end === false && subscription.cancel_at_period_end === true) {
        try {
          const email = await emailDuClient(
            typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
          );
          const fin = subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000).toLocaleDateString("fr-FR")
            : null;
          await previnerAdmin(
            "⚠️ Un client VolpeVox a programmé sa résiliation",
            `<p><strong>${email || "Un artisan"}</strong> a programmé la résiliation de son abonnement.</p>` +
              (fin ? `<p>L'accès reste actif jusqu'au <strong>${fin}</strong>.</p>` : "")
          );
        } catch {
          // sans gravite
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseAdmin
        .from("artisans")
        .update({ abonnement_actif: false })
        .eq("stripe_subscription_id", subscription.id);

      // Resiliation effective.
      try {
        const email = await emailDuClient(
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
        );
        await previnerAdmin(
          "❌ Un client VolpeVox a résilié",
          `<p><strong>${email || "Un artisan"}</strong> a résilié son abonnement. L'accès est désormais coupé.</p>`
        );
      } catch {
        // sans gravite
      }
      break;
    }
  }

  return NextResponse.json({ recu: true });
}
