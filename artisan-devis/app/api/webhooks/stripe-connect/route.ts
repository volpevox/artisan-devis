import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripeClient";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { envoyerNotificationPush } from "@/lib/pushNotifications";

// Filet de securite pour le paiement en ligne des factures (Stripe Connect,
// comptes connectes) : /api/confirmer-paiement-facture depend du navigateur
// du client, qui revient sur la page apres le paiement pour signaler que
// c'est bon. Si sa connexion coupe a ce moment precis, cet appel n'a jamais
// lieu et la facture reste marquee "impayee" alors que l'argent est bien
// arrive. Ce webhook est notifie directement par Stripe, independamment du
// navigateur du client -- il fait exactement la meme mise a jour, mais ne
// peut jamais etre rate.
//
// Cote Stripe Dashboard : ce endpoint doit etre configure pour ecouter les
// evenements des COMPTES CONNECTES (pas seulement le compte principal), sur
// l'evenement "checkout.session.completed".
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const corpsBrut = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(corpsBrut, signature!, process.env.STRIPE_CONNECT_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("[webhook stripe-connect] signature invalide :", err?.message || err);
    return NextResponse.json({ erreur: "Signature Stripe invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const devisId = session.metadata?.devis_id;

    if (devisId && session.payment_status === "paid") {
      const supabaseAdmin = createAdminSupabase();

      const { data: devis, error: erreurLecture } = await supabaseAdmin
        .from("devis")
        .select("artisan_id, payee_le, client_nom, numero_facture")
        .eq("id", devisId)
        .maybeSingle();

      if (erreurLecture) {
        console.error(`[webhook stripe-connect] lecture du devis ${devisId} echouee :`, erreurLecture.message);
      } else if (!devis) {
        console.error(`[webhook stripe-connect] devis ${devisId} introuvable (session ${session.id})`);
      } else if (!devis.payee_le) {
        const { error: erreurUpdate } = await supabaseAdmin
          .from("devis")
          .update({ payee_le: new Date().toISOString(), moyen_paiement: "Carte bancaire (en ligne)" })
          .eq("id", devisId);

        if (erreurUpdate) {
          console.error(`[webhook stripe-connect] mise a jour du devis ${devisId} echouee :`, erreurUpdate.message);
        } else {
          await envoyerNotificationPush(devis.artisan_id, {
            titre: "Facture payée !",
            corps: `${devis.client_nom || "Un client"} a payé sa facture${devis.numero_facture ? ` n°${devis.numero_facture}` : ""} en ligne.`,
            url: "/factures",
          });
        }
      }
      // Sinon deja marquee payee (le navigateur du client a eu le temps de
      // le faire avant ce webhook) : rien a faire, evite une notification
      // en double.
    }
  }

  return NextResponse.json({ recu: true });
}
