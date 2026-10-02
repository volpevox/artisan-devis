import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { envoyerNotificationPush } from "@/lib/pushNotifications";

export async function POST(req: NextRequest) {
  const { devisId, sessionId } = await req.json();

  if (!devisId || !sessionId) {
    return NextResponse.json({ erreur: "devisId et sessionId requis" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  const { data: devis } = await supabase
    .from("devis")
    .select("artisan_id, payee_le, client_nom, numero_facture, acompte_numero, acompte_payee_le")
    .eq("id", devisId)
    .maybeSingle();

  if (!devis) {
    return NextResponse.json({ erreur: "Facture introuvable" }, { status: 404 });
  }

  const { data: artisan } = await supabase
    .from("artisans")
    .select("stripe_account_id")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  if (!artisan?.stripe_account_id) {
    return NextResponse.json({ erreur: "Compte de paiement introuvable" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, undefined, {
    stripeAccount: artisan.stripe_account_id,
  });

  if (session.metadata?.devis_id !== devisId || session.payment_status !== "paid") {
    return NextResponse.json({ erreur: "Paiement non confirmé" }, { status: 400 });
  }

  const moyenPaiement = "Carte bancaire (en ligne)";
  const acompte = session.metadata?.acompte === "1";

  // Deja marquee (le webhook de secours est passe avant) : rien a refaire.
  const dejaPayee = acompte ? devis.acompte_payee_le : devis.payee_le;
  if (dejaPayee) {
    return NextResponse.json({ succes: true, acompte, payee_le: dejaPayee, moyen_paiement: moyenPaiement });
  }

  const payeeLe = new Date().toISOString();
  await supabase
    .from("devis")
    .update(
      acompte
        ? { acompte_payee_le: payeeLe, acompte_moyen_paiement: moyenPaiement }
        : { payee_le: payeeLe, moyen_paiement: moyenPaiement }
    )
    .eq("id", devisId);

  await envoyerNotificationPush(devis.artisan_id, {
    titre: acompte ? "Acompte payé !" : "Facture payée !",
    corps: acompte
      ? `${devis.client_nom || "Un client"} a payé son acompte (facture n°${devis.acompte_numero}) en ligne.`
      : `${devis.client_nom || "Un client"} a payé sa facture${devis.numero_facture ? ` n°${devis.numero_facture}` : ""} en ligne.`,
    url: acompte ? "/devis" : "/factures",
  });

  return NextResponse.json({ succes: true, acompte, payee_le: payeeLe, moyen_paiement: moyenPaiement });
}
